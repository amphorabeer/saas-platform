'use client';

import { useState } from 'react';

type PINGeneratorProps = {
  onGenerate: () => Promise<string | null>;
  onApply: (pin: string) => void;
  disabled?: boolean;
};

export function PINGenerator({ onGenerate, onApply, disabled }: PINGeneratorProps) {
  const [loading, setLoading] = useState(false);
  const handleClick = async () => {
    setLoading(true);
    try {
      const pin = await onGenerate();
      if (pin) onApply(pin);
    } finally {
      setLoading(false);
    }
  };
  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || loading}
      className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-slate-300 hover:bg-white/10 disabled:opacity-50"
    >
      {loading ? '...' : 'შემთხვევითი PIN'}
    </button>
  );
}
