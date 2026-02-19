'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Copy, Check } from 'lucide-react';

type UserProfile = {
  name: string | null;
  email: string;
  restCode: string;
};

type Props = {
  initial: UserProfile | null;
  onSaveName: (name: string) => Promise<void>;
};

export function UserProfileForm({ initial, onSaveName }: Props) {
  const [name, setName] = useState('');
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initial) setName(initial.name ?? '');
  }, [initial]);

  const handleCopyRestCode = async () => {
    if (!initial?.restCode) return;
    try {
      await navigator.clipboard.writeText(initial.restCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('კოპირება ვერ მოხერხდა');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await onSaveName(name.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'შეცდომა');
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-orange-500/50 focus:outline-none focus:ring-1 focus:ring-orange-500/30 disabled:opacity-50';
  const labelClass = 'mb-1 block text-sm font-medium text-slate-400';

  if (!initial) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 rounded-2xl border border-white/10 bg-[#1E293B]/60 p-6 backdrop-blur-sm"
    >
      <h3 className="text-base font-semibold text-white">მომხმარებლის პროფილი</h3>
      {error && (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelClass}>სახელი</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
            placeholder="სახელი"
          />
        </div>
        <div>
          <label className={labelClass}>ელ-ფოსტა</label>
          <input
            type="email"
            value={initial.email}
            readOnly
            className={inputClass + ' cursor-not-allowed'}
          />
          <p className="mt-1 text-xs text-slate-500">ცვლილება შეუძლებელია</p>
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-[#F97316] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-orange-600 disabled:opacity-50"
          >
            {saving ? 'შენახვა...' : 'შენახვა'}
          </button>
        </div>
      </form>

      <div className="border-t border-white/10 pt-6">
        <label className={labelClass}>რესტორნის კოდი (restCode)</label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={initial.restCode}
            readOnly
            className={inputClass + ' font-mono cursor-not-allowed'}
          />
          <button
            type="button"
            onClick={handleCopyRestCode}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-400 transition hover:bg-orange-500/20 hover:text-orange-400"
            title="კოპირება"
          >
            {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
          </button>
        </div>
        <p className="mt-1 text-xs text-slate-500">ლოგინისთვის გამოიყენება</p>
      </div>
    </motion.div>
  );
}
