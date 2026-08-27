import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import type { PortalCore } from "../../core/portal";
import { anthropic, MODEL } from "../anthropic";
import { CLIENT_TOOLS, callClientTool } from "./tools";
import { SYSTEM_BLOCKS } from "./system-prompt";

const MAX_ITERATIONS = 10;
const MAX_TOKENS = 4096;

export type ChatEvent =
  | { type: "text-delta"; text: string }
  | { type: "done" }
  | { type: "error"; message: string };

export type RunResult = {
  /** New messages produced this turn (the user turn plus every assistant/tool round). Empty when the run did not complete cleanly. */
  newMessages: Anthropic.Messages.MessageParam[];
  completed: boolean;
};

/**
 * Runs the client-scoped tool-use loop for one user turn.
 *
 * `core` must already be scoped to the requesting client — this function
 * trusts it completely and never touches the request body for tenancy.
 * Capped at MAX_ITERATIONS model calls so a tool-calling loop cannot run
 * unbounded; hitting the cap emits an error event and discards the turn
 * rather than persisting a half-finished exchange.
 */
export async function runClientChat(
  core: PortalCore,
  priorMessages: Anthropic.Messages.MessageParam[],
  userText: string,
  onEvent: (event: ChatEvent) => void
): Promise<RunResult> {
  const messages: Anthropic.Messages.MessageParam[] = [
    ...priorMessages,
    { role: "user", content: userText },
  ];

  for (let iteration = 1; iteration <= MAX_ITERATIONS; iteration++) {
    let finalMessage: Anthropic.Messages.Message;
    try {
      const stream = anthropic.messages.stream({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: SYSTEM_BLOCKS,
        tools: CLIENT_TOOLS,
        messages,
      });
      stream.on("text", (delta) => onEvent({ type: "text-delta", text: delta }));
      finalMessage = await stream.finalMessage();
    } catch (error) {
      onEvent({
        type: "error",
        message: error instanceof Error ? error.message : "The assistant request failed.",
      });
      return { newMessages: [], completed: false };
    }

    messages.push({ role: "assistant", content: finalMessage.content });

    if (finalMessage.stop_reason !== "tool_use") {
      onEvent({ type: "done" });
      return { newMessages: messages.slice(priorMessages.length), completed: true };
    }

    const toolUses = finalMessage.content.filter(
      (block): block is Anthropic.Messages.ToolUseBlock => block.type === "tool_use"
    );

    const toolResults: Anthropic.Messages.ToolResultBlockParam[] = [];
    for (const toolUse of toolUses) {
      const result = await callClientTool(
        core,
        toolUse.name,
        toolUse.input as Record<string, unknown>
      );
      toolResults.push({
        type: "tool_result",
        tool_use_id: toolUse.id,
        content: JSON.stringify(result),
      });
    }
    messages.push({ role: "user", content: toolResults });
  }

  onEvent({
    type: "error",
    message: `Stopped after ${MAX_ITERATIONS} tool calls without a final answer. Please try rephrasing your question.`,
  });
  return { newMessages: [], completed: false };
}
