'use client';

import { motion } from 'framer-motion';
import { Bot } from 'lucide-react';

type ChatMessageProps = {
  role: 'user' | 'assistant';
  content: string;
};

export function ChatMessage({ role, content }: ChatMessageProps) {
  if (role === 'user') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-end px-4 py-2"
      >
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-[#F97316]/20 border border-orange-500/30 px-4 py-3 text-sm text-white">
          {content}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex justify-start gap-3 px-4 py-2"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 border border-white/10 text-orange-400">
        <Bot className="h-4 w-4" />
      </div>
      <div className="max-w-[85%] rounded-2xl rounded-bl-md border border-white/10 bg-[#1E293B]/60 backdrop-blur-sm px-4 py-3 text-sm text-slate-200 shadow-lg">
        <div className="whitespace-pre-wrap break-words">{content}</div>
      </div>
    </motion.div>
  );
}
