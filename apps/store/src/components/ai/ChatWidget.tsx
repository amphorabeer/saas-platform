"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, Send, X, Settings } from "lucide-react";
import Link from "next/link";
import { useAiChatStore } from "@/stores/ai-chat-store";

export function ChatWidget() {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const {
    messages,
    isOpen,
    isLoading,
    error,
    addMessage,
    setLoading,
    setError,
    toggleOpen,
    close,
    clearMessages,
  } = useAiChatStore();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;

    setInput("");
    addMessage({ role: "user", content: text });
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            ...messages.map((m) => ({ role: m.role, content: m.content })),
            { role: "user" as const, content: text },
          ],
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const msg = data?.error ?? "შეცდომა მოხდა";
        setError(msg);
        addMessage({
          role: "assistant",
          content: msg.includes("კონფიგურირებული")
            ? `${msg} გთხოვთ დაამატოთ ANTHROPIC_API_KEY .env.local ფაილში და გადატვირთოთ სერვერი. პარამეტრების გვერდი: /settings/integrations`
            : msg,
        });
        return;
      }

      addMessage({
        role: "assistant",
        content: data.content ?? "პასუხი ვერ მოვიძე.",
      });
    } catch {
      setError("კავშირის შეცდომა");
      addMessage({
        role: "assistant",
        content: "კავშირის შეცდომა. გთხოვთ სცადოთ თავიდან.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        type="button"
        onClick={toggleOpen}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        aria-label="გახსენი AI ჩატი"
      >
        <MessageCircle className="h-6 w-6" />
      </button>

      {/* Chat panel */}
      {isOpen && (
        <div
          className="fixed bottom-24 right-6 z-50 flex w-[400px] flex-col overflow-hidden rounded-xl border border-border bg-bg-secondary shadow-xl"
          style={{ height: "500px" }}
        >
          <div className="flex items-center justify-between border-b border-border bg-bg-tertiary px-4 py-3">
            <h3 className="font-medium">AI ასისტენტი</h3>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={clearMessages}
                className="rounded p-1.5 text-text-muted hover:bg-bg-secondary hover:text-text"
                title="წაშლა"
              >
                წაშლა
              </button>
              <Link
                href="/settings/integrations"
                className="rounded p-1.5 text-text-muted hover:bg-bg-secondary hover:text-text"
                title="პარამეტრები"
              >
                <Settings className="h-4 w-4" />
              </Link>
              <button
                type="button"
                onClick={close}
                className="rounded p-1.5 text-text-muted hover:bg-bg-secondary hover:text-text"
                aria-label="დახურვა"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <p className="text-center text-sm text-text-muted py-8">
                დაიწყეთ შეკითხვით, მაგალითად: &quot;გუშინ რამდენი გაყიდვა მქონდა?&quot;
              </p>
            )}
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-bg-tertiary text-text"
                  }`}
                >
                  <div className="whitespace-pre-wrap break-words">{m.content}</div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="rounded-lg bg-bg-tertiary px-3 py-2 text-sm text-text-muted">
                  იფიქრებს...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSend} className="border-t border-border p-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="დასვით შეკითხვა..."
                disabled={isLoading}
                className="flex-1 rounded-lg border border-border bg-bg-tertiary px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="rounded-lg bg-primary px-3 py-2 text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
