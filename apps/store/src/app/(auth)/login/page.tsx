"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";

  const [storeCode, setStoreCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!storeCode.trim() || !email.trim() || !password) {
      setError("შეავსეთ ყველა ველი");
      setLoading(false);
      return;
    }

    try {
      const result = await signIn("credentials", {
        storeCode: storeCode.trim(),
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });

      if (result?.ok) {
        router.push(callbackUrl);
        router.refresh();
      } else {
        setError(result?.error ?? "შესვლა ვერ მოხერხდა. სცადეთ თავიდან.");
      }
    } catch {
      setError("სისტემური შეცდომა. სცადეთ თავიდან.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-copper/20 via-bg-primary to-bg-secondary p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-bg-secondary p-8 shadow-xl">
        <div className="mb-8 text-center">
          <span className="text-4xl">🏪</span>
          <h1 className="mt-3 text-2xl font-bold text-text">Store POS</h1>
          <p className="mt-1 text-sm text-text-muted">შესვლა სისტემაში</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-text-secondary">
              მაღაზიის კოდი
            </label>
            <input
              type="text"
              value={storeCode}
              onChange={(e) =>
                setStoreCode(e.target.value.replace(/\D/g, "").slice(0, 4))
              }
              placeholder="0000"
              maxLength={4}
              className="w-full rounded-lg border border-border bg-bg-tertiary px-4 py-3 text-center text-2xl tracking-widest font-mono text-text placeholder:text-text-muted focus:border-copper focus:outline-none focus:ring-1 focus:ring-copper"
              disabled={loading}
            />
            <p className="mt-1 text-center text-xs text-text-muted">
              4 ნიშნა კოდი რომელიც მიიღეთ რეგისტრაციისას
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-text-secondary">
              ელ-ფოსტა
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full rounded-lg border border-border bg-bg-tertiary px-4 py-3 text-text placeholder:text-text-muted focus:border-copper focus:outline-none focus:ring-1 focus:ring-copper"
              disabled={loading}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-text-secondary">
              პაროლი
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg border border-border bg-bg-tertiary px-4 py-3 text-text placeholder:text-text-muted focus:border-copper focus:outline-none focus:ring-1 focus:ring-copper"
              disabled={loading}
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-copper py-3 font-medium text-white transition hover:bg-copper/90 disabled:opacity-50"
          >
            {loading ? "იტვირთება..." : "შესვლა"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-bg-primary"><span className="text-text-muted">იტვირთება...</span></div>}>
      <LoginForm />
    </Suspense>
  );
}
