'use client';

import { motion } from 'framer-motion';

export function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 px-4 py-2">
      <motion.span
        className="h-2 w-2 rounded-full bg-orange-400/80"
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 0.8, repeat: Infinity }}
      />
      <motion.span
        className="h-2 w-2 rounded-full bg-orange-400/80"
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 0.8, repeat: Infinity, delay: 0.2 }}
      />
      <motion.span
        className="h-2 w-2 rounded-full bg-orange-400/80"
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 0.8, repeat: Infinity, delay: 0.4 }}
      />
    </div>
  );
}
