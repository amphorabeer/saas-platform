'use client'

import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('პაროლები არ ემთხვევა')
      return
    }

    if (password.length < 6) {
      setError('პაროლი უნდა იყოს მინიმუმ 6 სიმბოლო')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })

      const data = await res.json()

      if (res.ok) {
        setSuccess(true)
        setTimeout(() => router.push('/login'), 3000)
      } else {
        setError(data.error || 'შეცდომა მოხდა')
      }
    } catch (err) {
      setError('შეცდომა მოხდა')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800 p-8 rounded-xl max-w-md w-full text-center">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-white mb-4">არასწორი ბმული</h2>
          <Link href="/forgot-password" className="text-amber-500 hover:text-amber-400">
            თავიდან სცადეთ
          </Link>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800 p-8 rounded-xl max-w-md w-full text-center">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-white mb-4">პაროლი შეიცვალა!</h2>
          <p className="text-slate-300">გადამისამართება შესვლის გვერდზე...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-slate-800 p-8 rounded-xl max-w-md w-full">
        <h1 className="text-2xl font-bold text-white mb-2">🍺 BrewMaster PRO</h1>
        <p className="text-slate-400 mb-6">ახალი პაროლის დაყენება</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-slate-300 mb-2">ახალი პაროლი</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="მინიმუმ 6 სიმბოლო"
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
              required
            />
          </div>

          <div>
            <label className="block text-slate-300 mb-2">გაიმეორეთ პაროლი</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="პაროლის დადასტურება"
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
              required
            />
          </div>

          {error && (
            <div className="bg-red-500/20 text-red-400 p-3 rounded-lg">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium disabled:opacity-50"
          >
            {loading ? 'იცვლება...' : 'პაროლის შეცვლა'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-900 flex items-center justify-center"><div className="text-white">იტვირთება...</div></div>}>
      <ResetPasswordForm />
    </Suspense>
  )
}
