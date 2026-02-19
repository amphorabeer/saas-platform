'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';

type Props = {
  onChangePassword: (oldPassword: string, newPassword: string, confirmPassword: string) => Promise<void>;
};

export function ChangePasswordForm({ onChangePassword }: Props) {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    if (!oldPassword || !newPassword || !confirmPassword) {
      setError('ყველა ველი სავალდებულოა');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('ახალი პაროლი და დადასტურება არ ემთხვევა');
      return;
    }
    if (newPassword.length < 6) {
      setError('ახალი პაროლი უნდა იყოს მინიმუმ 6 სიმბოლო');
      return;
    }
    setSaving(true);
    try {
      await onChangePassword(oldPassword, newPassword, confirmPassword);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'შეცდომა');
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-orange-500/50 focus:outline-none focus:ring-1 focus:ring-orange-500/30';
  const labelClass = 'mb-1 block text-sm font-medium text-slate-400';

  return (
    <motion.form
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      onSubmit={handleSubmit}
      className="space-y-6 rounded-2xl border border-white/10 bg-[#1E293B]/60 p-6 backdrop-blur-sm"
    >
      <h3 className="flex items-center gap-2 text-base font-semibold text-white">
        <Lock className="h-5 w-5 text-orange-400" />
        პაროლის შეცვლა
      </h3>
      {error && (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>
      )}
      {success && (
        <p className="rounded-lg bg-green-500/10 px-3 py-2 text-sm text-green-400">
          პაროლი წარმატებით შეიცვალა
        </p>
      )}
      <div className="space-y-4">
        <div>
          <label className={labelClass}>ძველი პაროლი</label>
          <input
            type="password"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            className={inputClass}
            placeholder="••••••••"
            autoComplete="current-password"
          />
        </div>
        <div>
          <label className={labelClass}>ახალი პაროლი</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className={inputClass}
            placeholder="••••••••"
            autoComplete="new-password"
          />
        </div>
        <div>
          <label className={labelClass}>დადასტურება</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={inputClass}
            placeholder="••••••••"
            autoComplete="new-password"
          />
        </div>
      </div>
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-[#F97316] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-orange-600 disabled:opacity-50"
        >
          {saving ? 'შეცვლა...' : 'პაროლის შეცვლა'}
        </button>
      </div>
    </motion.form>
  );
}
