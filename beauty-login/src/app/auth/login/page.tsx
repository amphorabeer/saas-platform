'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Scissors, Eye, EyeOff, Loader2, Hash, Mail, Lock, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [beautyCode, setBeautyCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!beautyCode.trim() || !email.trim() || !password) {
      setError('შეავსეთ ყველა ველი');
      return;
    }

    setLoading(true);

    try {
      const result = await signIn('credentials', {
        beautyCode: beautyCode.trim(),
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });

      if (result?.ok) {
        router.push('/dashboard');
        router.refresh();
      } else {
        setError(result?.error || 'არასწორი მონაცემები');
      }
    } catch {
      setError('შესვლა ვერ მოხერხდა');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center px-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary-600/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-primary-400 to-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary-500/20">
            <Scissors className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">BeautySalon PRO</h1>
          <p className="text-dark-400 mt-1">შესვლა სისტემაში</p>
        </div>

        {/* Login form */}
        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
                <AlertCircle size={16} className="shrink-0" />
                {error}
              </div>
            )}

            {/* Beauty Code */}
            <div>
              <label className="label flex items-center gap-2">
                <Hash size={14} />
                სალონის კოდი
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={beautyCode}
                onChange={(e) => setBeautyCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className="input text-center text-2xl font-mono tracking-[0.5em]"
                placeholder="0000"
                maxLength={4}
                disabled={loading}
              />
              <p className="text-[10px] text-dark-500 text-center mt-1">
                4 ნიშნა კოდი რომელიც მიიღეთ რეგისტრაციისას
              </p>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="label flex items-center gap-2">
                <Mail size={14} />
                ელფოსტა
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="email@example.com"
                required
                disabled={loading}
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="label flex items-center gap-2">
                <Lock size={14} />
                პაროლი
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pr-10"
                  placeholder="••••••••"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-200"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 py-2.5"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {loading ? 'შესვლა...' : 'შესვლა'}
            </button>
          </form>
        </div>

        <p className="text-center text-dark-500 text-sm mt-6">
          არ გაქვთ ანგარიში?{' '}
          <Link
            href="https://geobiz.app/modules/beauty/pricing"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-400 hover:underline"
          >
            რეგისტრაცია
          </Link>
        </p>

        <p className="text-center text-dark-600 text-xs mt-2">
          GeoBiz.app © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
