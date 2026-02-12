'use client';

import { useState, useRef, useEffect } from 'react';
import { useLanguage } from '@/lib/language-context';
import { usePathname } from 'next/navigation';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: { title: string; hallName?: string; stopNumber?: number }[];
}

const UI_TEXT: Record<string, {
  placeholder: string;
  title: string;
  thinking: string;
  error: string;
  suggestions: string[];
}> = {
  ka: {
    placeholder: 'დასვით შეკითხვა...',
    title: '🏛️ GeoGuide ასისტენტი',
    thinking: 'ვფიქრობ...',
    error: 'დროებით ვერ ვპასუხობ. სცადეთ მოგვიანებით.',
    suggestions: [
      'რა არის ეს მუზეუმი?',
      'რა შემიძლია ვნახო აქ?',
      'როგორ შევიძინო ტური?',
    ],
  },
  en: {
    placeholder: 'Ask a question...',
    title: '🏛️ GeoGuide Assistant',
    thinking: 'Thinking...',
    error: 'Temporarily unavailable. Please try again later.',
    suggestions: [
      'What is this museum about?',
      'What can I see here?',
      'How do I purchase a tour?',
    ],
  },
  ru: {
    placeholder: 'Задайте вопрос...',
    title: '🏛️ Ассистент GeoGuide',
    thinking: 'Думаю...',
    error: 'Временно недоступно. Попробуйте позже.',
    suggestions: [
      'Что это за музей?',
      'Что здесь можно увидеть?',
      'Как купить тур?',
    ],
  },
};

function getSessionToken(): string {
  if (typeof window === 'undefined') return '';
  let token = localStorage.getItem('geoguide-chat-session');
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem('geoguide-chat-session', token);
  }
  return token;
}

function extractMuseumId(pathname: string): string | null {
  // Pattern: /museum/[slug] or /museum/[slug]/tour/[tourId]
  const match = pathname.match(/\/museum\/([^/]+)/);
  return match ? match[1] : null;
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { language } = useLanguage();
  const pathname = usePathname();

  const museumId = extractMuseumId(pathname);
  const ui = UI_TEXT[language] || UI_TEXT.en;

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Don't show on homepage (no museum context)
  if (!museumId) return null;

  const sendMessage = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText,
          museumId,
          language,
          sessionToken: getSessionToken(),
          deviceType: /Mobile|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
        }),
      });

      const data = await res.json();

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message || data.error || ui.error,
        sources: data.sources,
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch {
      setMessages(prev => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: 'assistant', content: ui.error },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
          aria-label="Open chat"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </button>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-0 right-0 sm:bottom-6 sm:right-6 z-50 w-full sm:w-96 h-[100dvh] sm:h-[500px] bg-white sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200">
          {/* Header */}
          <div className="bg-blue-600 text-white px-4 py-3 flex items-center justify-between flex-shrink-0">
            <span className="font-semibold text-sm">{ui.title}</span>
            <button
              onClick={() => setIsOpen(false)}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-blue-500 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.length === 0 && (
              <div className="space-y-2">
                <p className="text-gray-500 text-sm text-center mb-4">
                  {language === 'ka' ? 'დასვით კითხვა მუზეუმის შესახებ' :
                   language === 'ru' ? 'Задайте вопрос о музее' :
                   'Ask a question about the museum'}
                </p>
                {ui.suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(s)}
                    className="block w-full text-left px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded-lg text-gray-700 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-md'
                    : 'bg-gray-100 text-gray-800 rounded-bl-md'
                }`}>
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <p className="text-xs text-gray-500 mb-1">
                        {language === 'ka' ? 'წყაროები:' : language === 'ru' ? 'Источники:' : 'Sources:'}
                      </p>
                      {msg.sources.map((s, i) => (
                        <span key={i} className="inline-block text-xs bg-white/80 text-gray-600 px-2 py-0.5 rounded mr-1 mb-1">
                          {s.stopNumber && `#${s.stopNumber} `}{s.title}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 px-4 py-2 rounded-2xl rounded-bl-md">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t px-3 py-2 flex-shrink-0 bg-white">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                placeholder={ui.placeholder}
                disabled={isLoading}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-full text-sm focus:outline-none focus:border-blue-500 disabled:opacity-50"
              />
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || isLoading}
                className="w-9 h-9 bg-blue-600 text-white rounded-full flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors flex-shrink-0"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
