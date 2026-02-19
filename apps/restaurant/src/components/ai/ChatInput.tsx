'use client';

import { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';

type ChatInputProps = {
  onSend: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
};

export function ChatInput({ onSend, disabled, placeholder = 'შეიყვანეთ შეტყობინება...' }: ChatInputProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [value]);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-[#1E293B]/60 backdrop-blur-sm p-2">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={1}
        className="min-h-[44px] max-h-40 flex-1 resize-none rounded-xl border-0 bg-transparent px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-0 disabled:opacity-50"
      />
      <button
        type="button"
        onClick={handleSubmit}
        disabled={disabled || !value.trim()}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F97316] text-white transition hover:bg-orange-600 disabled:opacity-40 disabled:hover:bg-[#F97316]"
        aria-label="გაგზავნა"
      >
        <Send className="h-5 w-5" />
      </button>
    </div>
  );
}
