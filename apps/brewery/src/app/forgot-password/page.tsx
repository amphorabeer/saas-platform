'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [tenantCode, setTenantCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, tenantCode }),
      })

      const data = await res.json()

      if (res.ok) {
        setSent(true)
      } else {
        setError(data.error || 'შეცდომა მოხდა')
      }
    } catch (err) {
      setError('შეცდომა მოხდა')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800 p-8 rounded-xl max-w-md w-full text-center">
          <div className="text-6xl mb-4">📧</div>
          <h2 className="text-2xl font-bold text-white mb-4">შეამოწმეთ ელ-ფოსტა</h2>
          <p className="text-slate-300 mb-6">
            თუ ეს ელ-ფოსტა რეგისტრირებულია, მიიღებთ პაროლის აღდგენის ბმულს.
          </p>
          <Link href="/login" className="text-amber-500 hover:text-amber-400">
            შესვლის გვერდზე დაბრუნება
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-slate-800 p-8 rounded-xl max-w-md w-full">
        <h1 className="text-2xl font-bold text-white mb-2">🍺 BrewMaster PRO</h1>
        <p className="text-slate-400 mb-6">პაროლის აღდგენა</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-slate-300 mb-2">კომპანიის კოდი</label>
            <input
              type="text"
              value={tenantCode}
              onChange={(e) => setTenantCode(e.target.value.toUpperCase())}
              placeholder="BREW-0000"
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
              required
            />
          </div>

          <div>
            <label className="block text-slate-300 mb-2">ელ-ფოსტა</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
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
            {loading ? 'იგზავნება...' : 'აღდგენის ბმულის გაგზავნა'}
          </button>
        </form>

        <p className="text-center text-slate-400 mt-6">
          <Link href="/login" className="text-amber-500 hover:text-amber-400">
            შესვლის გვერდზე დაბრუნება
          </Link>
        </p>
      </div>
    </div>
  )
}
