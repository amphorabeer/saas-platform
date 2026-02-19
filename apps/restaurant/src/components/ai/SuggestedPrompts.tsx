'use client';

import { motion } from 'framer-motion';

const SUGGESTED_PROMPTS = [
  '📊 დღის გაყიდვების ანალიზი',
  '🍽️ მენიუს ოპტიმიზაციის რეკომენდაცია',
  '📦 რომელი ინგრედიენტები იწურება?',
  '💰 Food cost როგორ შევამცირო?',
  '👥 ოფიციანტების ეფექტურობა',
  '📈 ამ კვირის ტრენდები',
];

type SuggestedPromptsProps = {
  onSelect: (text: string) => void;
};

export function SuggestedPrompts({ onSelect }: SuggestedPromptsProps) {
  return (
    <div className="flex flex-wrap justify-center gap-2 px-4 py-4">
      {SUGGESTED_PROMPTS.map((text, i) => (
        <motion.button
          key={text}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          type="button"
          onClick={() => onSelect(text)}
          className="rounded-xl border border-white/10 bg-[#1E293B]/50 px-4 py-2.5 text-sm text-slate-300 backdrop-blur-sm transition hover:border-orange-500/30 hover:bg-orange-500/10 hover:text-orange-300"
        >
          {text}
        </motion.button>
      ))}
    </div>
  );
}
