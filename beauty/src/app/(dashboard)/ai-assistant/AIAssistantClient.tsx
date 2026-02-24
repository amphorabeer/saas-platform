'use client';

import { useState, useRef, useEffect } from 'react';
import { Bot, Send, User, Sparkles, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const SUGGESTIONS = [
  'რა არის ამ თვის შემოსავალი?',
  'რომელი სერვისია ყველაზე პოპულარული?',
  'რა მარაგი ამოწურვის პირზეა?',
  'მომავალი ჯავშნები მაჩვენე',
  'როგორ გავზარდო კლიენტების რაოდენობა?',
  'სოციალური ქსელის პოსტი დამიწერე',
];

export function AIAssistantClient() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text?: string) => {
    const content = text || input.trim();
    if (!content || loading) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: new Date(),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'შეცდომა');
      }

      const data = await res.json();

      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.reply,
        timestamp: new Date(),
      };

      setMessages([...newMessages, assistantMsg]);
    } catch (err: any) {
      const errorMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `⚠️ ${err.message}`,
        timestamp: new Date(),
      };
      setMessages([...newMessages, errorMsg]);
    }

    setLoading(false);
    inputRef.current?.focus();
  };

  const clearChat = () => {
    setMessages([]);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Bot size={24} className="text-primary-400" />
            AI ასისტენტი
          </h1>
          <p className="text-dark-400 mt-1">თქვენი ბიზნეს-ასისტენტი</p>
        </div>
        {messages.length > 0 && (
          <button onClick={clearChat} className="btn-secondary flex items-center gap-2 text-sm">
            <Trash2 size={14} /> გასუფთავება
          </button>
        )}
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 bg-primary-500/10 rounded-2xl flex items-center justify-center mb-4">
              <Sparkles size={32} className="text-primary-400" />
            </div>
            <h2 className="text-lg font-semibold text-white mb-2">გამარჯობა!</h2>
            <p className="text-dark-400 text-sm mb-6 max-w-md">
              მე ვარ თქვენი AI ასისტენტი. შემიძლია ვუპასუხო კითხვებს სალონის შემოსავლების,
              ჯავშნების, მარაგის შესახებ და მოგცეთ ბიზნეს-რეკომენდაციები.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg w-full">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="text-left p-3 bg-dark-800 border border-dark-700 rounded-xl text-sm text-dark-300 hover:border-primary-500/30 hover:text-primary-400 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                'flex gap-3',
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 bg-primary-500/20 rounded-lg flex items-center justify-center shrink-0">
                  <Bot size={16} className="text-primary-400" />
                </div>
              )}
              <div
                className={cn(
                  'max-w-[75%] rounded-2xl px-4 py-3',
                  msg.role === 'user'
                    ? 'bg-primary-500/20 text-white rounded-tr-md'
                    : 'bg-dark-800 border border-dark-700 text-dark-200 rounded-tl-md'
                )}
              >
                <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                <p className="text-[10px] text-dark-500 mt-1.5">
                  {msg.timestamp.toLocaleTimeString('ka-GE', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              {msg.role === 'user' && (
                <div className="w-8 h-8 bg-dark-700 rounded-lg flex items-center justify-center shrink-0">
                  <User size={16} className="text-dark-300" />
                </div>
              )}
            </div>
          ))
        )}

        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 bg-primary-500/20 rounded-lg flex items-center justify-center shrink-0">
              <Bot size={16} className="text-primary-400" />
            </div>
            <div className="bg-dark-800 border border-dark-700 rounded-2xl rounded-tl-md px-4 py-3">
              <div className="flex gap-1.5">
                <div className="w-2 h-2 bg-dark-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-dark-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-dark-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-dark-700 pt-4">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="დასვით კითხვა..."
            disabled={loading}
            className="input flex-1"
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            className="btn-primary px-4 disabled:opacity-40"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
