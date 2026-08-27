import type Anthropic from "@anthropic-ai/sdk";
import { requireClient } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createPortalCore } from "@/core/portal";
import { clientScope } from "@/core/scope";
import { runClientChat, type ChatEvent } from "@/lib/chat/run";

export const runtime = "nodejs";

async function loadHistory(clientId: string) {
  const rows = await prisma.clientChatMessage.findMany({
    where: { clientId },
    orderBy: { createdAt: "asc" },
  });
  return rows.map(
    (row): Anthropic.Messages.MessageParam => ({
      role: row.role,
      content: row.content as unknown as Anthropic.Messages.MessageParam["content"],
    })
  );
}

export async function GET() {
  const session = await requireClient();
  const rows = await prisma.clientChatMessage.findMany({
    where: { clientId: session.userId },
    orderBy: { createdAt: "asc" },
  });

  const transcript = rows
    .map((row) => {
      if (row.role === "user" && typeof row.content === "string") {
        return { role: "user" as const, text: row.content };
      }
      if (row.role === "assistant" && Array.isArray(row.content)) {
        const text = (row.content as unknown as Anthropic.Messages.ContentBlock[])
          .filter((block): block is Anthropic.Messages.TextBlock => block.type === "text")
          .map((block) => block.text)
          .join("");
        return text ? { role: "assistant" as const, text } : null;
      }
      return null;
    })
    .filter((entry): entry is { role: "user" | "assistant"; text: string } => entry !== null);

  return Response.json({ messages: transcript });
}

export async function POST(req: Request) {
  const session = await requireClient();

  const body = await req.json().catch(() => null);
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  if (!message) {
    return Response.json({ error: "message is required" }, { status: 400 });
  }

  const core = createPortalCore(prisma, clientScope(session.userId));
  const priorMessages = await loadHistory(session.userId);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: ChatEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      const result = await runClientChat(core, priorMessages, message, send);

      if (result.completed && result.newMessages.length > 0) {
        await prisma.clientChatMessage.createMany({
          data: result.newMessages.map((m) => ({
            clientId: session.userId,
            role: m.role as "user" | "assistant",
            content: m.content as object,
          })),
        });
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
