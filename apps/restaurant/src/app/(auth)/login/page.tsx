'use client';

import { useState, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Hash, Mail, Lock, UtensilsCrossed, AlertCircle } from 'lucide-react';
import Link from 'next/link';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') ?? '/dashboard';

  const [restCode, setRestCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!restCode.trim() || !email.trim() || !password) {
      setError('შეავსეთ ყველა ველი');
      setLoading(false);
      return;
    }

    try {
      const result = await signIn('credentials', {
        restCode: restCode.trim(),
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });

      if (result?.ok) {
        router.push(callbackUrl);
        router.refresh();
      } else {
        setError(result?.error ?? 'შესვლა ვერ მოხერხდა. სცადეთ თავიდან.');
      }
    } catch {
      setError('სისტემური შეცდომა. სცადეთ თავიდან.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0F172A] p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-orange-500/20 blur-3xl" />
        <div className="absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-emerald-500/15 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 shadow-xl backdrop-blur-xl"
      >
        <div className="mb-8 flex flex-col items-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-500 text-white shadow-lg">
            <UtensilsCrossed className="h-7 w-7" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-white">RestoPOS</h1>
          <p className="mt-1 text-sm text-slate-400">შესვლა სისტემაში</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-300">
              <Hash className="h-4 w-4" />
              რესტორნის კოდი
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={restCode}
              onChange={(e) =>
                setRestCode(e.target.value.replace(/\D/g, '').slice(0, 4))
              }
              placeholder="0000"
              maxLength={4}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-center text-2xl font-mono tracking-[0.5em] text-white placeholder:text-slate-500 focus:border-orange-500/50 focus:outline-none focus:ring-1 focus:ring-orange-500/50"
              disabled={loading}
            />
            <p className="mt-1 text-center text-xs text-slate-500">
              4 ნიშნა კოდი რომელიც მიიღეთ რეგისტრაციისას
            </p>
          </div>

          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-300">
              <Mail className="h-4 w-4" />
              ელ-ფოსტა
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-slate-500 focus:border-orange-500/50 focus:outline-none focus:ring-1 focus:ring-orange-500/50"
              disabled={loading}
            />
          </div>

          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-300">
              <Lock className="h-4 w-4" />
              პაროლი
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-slate-500 focus:border-orange-500/50 focus:outline-none focus:ring-1 focus:ring-orange-500/50"
              disabled={loading}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-gradient-to-r from-orange-500 to-red-500 py-3 font-medium text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {loading ? 'იტვირთება...' : 'შესვლა'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          არ გაქვთ ანგარიში?{' '}
          <Link
            href="https://geobiz.app/modules/restaurant/pricing"
            target="_blank"
            rel="noopener noreferrer"
            className="text-orange-400 hover:underline"
          >
            რეგისტრაცია
          </Link>
        </p>
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#0F172A]">
          <span className="text-slate-400">იტვირთება...</span>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
