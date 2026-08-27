"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { MessageCircle, Send } from "lucide-react";

type Message = { role: "user" | "assistant"; text: string };

/** Parses **bold** spans out of one line of text. No other markdown is recognized. */
function renderInline(line: string, keyPrefix: string) {
  const parts = line.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={`${keyPrefix}-${i}`} className="font-semibold text-slate-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <Fragment key={`${keyPrefix}-${i}`}>{part}</Fragment>;
  });
}

/**
 * Renders assistant replies with light structure: blank-line-separated blocks
 * become paragraphs, and a block whose every line starts with "- " becomes a
 * bullet list. Nothing fancier — the system prompt only asks the model for
 * this much, so this is all the parser needs to understand.
 */
function AssistantText({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/).filter((b) => b.trim().length > 0);

  return (
    <div className="space-y-2">
      {blocks.map((block, bi) => {
        const lines = block.split("\n").filter((l) => l.trim().length > 0);
        const isList = lines.length > 0 && lines.every((l) => l.trim().startsWith("- "));

        if (isList) {
          return (
            <ul key={bi} className="list-disc space-y-1 pl-5">
              {lines.map((line, li) => (
                <li key={li}>{renderInline(line.trim().slice(2), `${bi}-${li}`)}</li>
              ))}
            </ul>
          );
        }

        return (
          <p key={bi}>
            {lines.map((line, li) => (
              <Fragment key={li}>
                {li > 0 ? <br /> : null}
                {renderInline(line, `${bi}-${li}`)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}

type StreamEvent =
  | { type: "text-delta"; text: string }
  | { type: "done" }
  | { type: "error"; message: string };

export function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/client/chat")
      .then((res) => res.json())
      .then((data) => setMessages(data.messages ?? []))
      .catch(() => setError("Could not load your conversation history."));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  async function send() {
    const text = input.trim();
    if (!text || sending) return;

    setInput("");
    setError(null);
    setMessages((prev) => [...prev, { role: "user", text }]);
    setSending(true);
    setMessages((prev) => [...prev, { role: "assistant", text: "" }]);

    try {
      const res = await fetch("/api/client/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      if (!res.body) throw new Error("No response stream.");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const event: StreamEvent = JSON.parse(line.slice("data: ".length));

          if (event.type === "text-delta") {
            setMessages((prev) => {
              const next = [...prev];
              next[next.length - 1] = {
                role: "assistant",
                text: next[next.length - 1].text + event.text,
              };
              return next;
            });
          } else if (event.type === "error") {
            setError(event.message);
            setMessages((prev) => prev.slice(0, -1));
          }
        }
      }
    } catch {
      setError("Something went wrong sending that message. Please try again.");
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-[32rem] flex-col rounded-3xl border border-slate-200 bg-white p-6">
      <div className="mb-4 flex items-center gap-2">
        <MessageCircle className="h-4 w-4 text-blue-500" />
        <h2 className="text-lg font-semibold text-slate-900">Ask AnchorTech</h2>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto pr-1">
        {messages.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
            Ask about your projects, invoices, or retainer. This assistant can only see
            your own account and cannot change anything — it can pass a message along to
            the AnchorTech team if you ask.
          </p>
        ) : (
          messages.map((m, i) => (
            <div
              key={i}
              className={`rounded-2xl px-4 py-3 text-sm leading-6 ${
                m.role === "user"
                  ? "ml-8 bg-blue-50 text-blue-900"
                  : "mr-8 bg-slate-50 text-slate-700"
              }`}
            >
              {m.role === "assistant" && m.text ? (
                <AssistantText text={m.text} />
              ) : (
                m.text || (sending && i === messages.length - 1 ? "…" : "")
              )}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {error ? <p className="mt-2 text-xs text-rose-600">{error}</p> : null}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="mt-4 flex items-center gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={sending}
          placeholder="Ask a question…"
          className="flex-1 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="flex items-center gap-2 rounded-full bg-blue-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-400 disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
