'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Bot } from 'lucide-react';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { TypingIndicator } from './TypingIndicator';
import { SuggestedPrompts } from './SuggestedPrompts';

type Message = { role: 'user' | 'assistant'; content: string };

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isStreaming]);

  const sendMessage = useCallback(async (userContent: string) => {
    const newUserMessage: Message = { role: 'user', content: userContent };
    const nextMessages = [...messages, newUserMessage];
    setMessages(nextMessages);
    setIsStreaming(true);

    let assistantContent = '';

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        assistantContent = data?.error ?? `შეცდომა: ${res.status}`;
        setMessages((prev) => [...prev, { role: 'assistant', content: assistantContent }]);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        setMessages((prev) => [...prev, { role: 'assistant', content: 'სტრიმი ვერ მოიძებნა.' }]);
        return;
      }

      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        assistantContent += chunk;
        setMessages((prev) => {
          const hasAssistant = prev[prev.length - 1]?.role === 'assistant';
          if (hasAssistant) {
            const out = [...prev];
            out[out.length - 1] = { role: 'assistant', content: assistantContent };
            return out;
          }
          return [...prev, { role: 'assistant', content: assistantContent }];
        });
      }
    } catch (err) {
      const errorText = err instanceof Error ? err.message : 'შეცდომა';
      setMessages((prev) => [...prev, { role: 'assistant', content: `შეცდომა: ${errorText}` }]);
    } finally {
      setIsStreaming(false);
    }
  }, [messages]);

  const handleClear = useCallback(() => {
    setMessages([]);
  }, []);

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col rounded-2xl border border-white/10 bg-[#0F172A]/80 backdrop-blur-sm overflow-hidden">
      {/* Header with clear */}
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <h2 className="text-base font-semibold text-white">AI ასისტენტი</h2>
        <button
          type="button"
          onClick={handleClear}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-400 transition hover:bg-white/5 hover:text-white"
        >
          <Trash2 className="h-4 w-4" />
          გასუფთავება
        </button>
      </div>

      {/* Scrollable messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <ChatMessage key={i} role={msg.role} content={msg.content} />
          ))}
        </AnimatePresence>
        {messages.length === 0 && <SuggestedPrompts onSelect={sendMessage} />}
        {isStreaming && messages[messages.length - 1]?.role !== 'assistant' && (
          <div className="flex items-center gap-3 px-4 py-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 border border-white/10 text-orange-400">
              <Bot className="h-4 w-4" />
            </div>
            <TypingIndicator />
          </div>
        )}
      </div>

      {/* Input bar */}
      <div className="border-t border-white/10 p-4">
        <ChatInput onSend={sendMessage} disabled={isStreaming} />
      </div>
    </div>
  );
}
