'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';

export function POSLayout({
  topBar,
  leftPanel,
  rightPanel,
}: {
  topBar: ReactNode;
  leftPanel: ReactNode;
  rightPanel: ReactNode;
}) {
  return (
    <div className="fixed inset-0 flex flex-col bg-[#0F172A]">
      {/* Top bar */}
      <header className="relative z-10 shrink-0 border-b border-white/10 bg-[#1E293B]/80 backdrop-blur-xl">
        {topBar}
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Left — menu */}
        <motion.div
          initial={{ opacity: 1 }}
          className="flex flex-col w-[65%] min-w-0 border-r border-white/10 bg-[#0F172A]/50"
        >
          {leftPanel}
        </motion.div>

        {/* Right — cart */}
        <motion.div
          initial={{ opacity: 1 }}
          className="flex flex-col w-[35%] min-w-[320px] bg-[#1E293B]/60 backdrop-blur-sm"
        >
          {rightPanel}
        </motion.div>
      </div>
    </div>
  );
}
