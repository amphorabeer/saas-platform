'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'

export default function ResetPasswordPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!token) {
      setError('არასწორი ბმული')
    }
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password !== confirmPassword) {
      setError('პაროლები არ ემთხვევა')
      return
    }

    if (password.length < 6) {
      setError('პაროლი უნდა იყოს მინიმუმ 6 სიმბოლო')
      return
    }

    setLoading(true)
    setError('')

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

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl max-w-md w-full text-center shadow-xl">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">პაროლი შეიცვალა</h2>
          <p className="text-gray-600 mb-6">
            ახლა შეგიძლიათ შეხვიდეთ ახალი პაროლით.
          </p>
          <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium">
            შესვლის გვერდზე გადასვლა
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-xl max-w-md w-full shadow-xl">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">🏨 Hotel System</h1>
        <p className="text-gray-500 mb-6">ახალი პაროლის დაყენება</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-700 mb-2">ახალი პაროლი</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="მინიმუმ 6 სიმბოლო"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
              minLength={6}
            />
          </div>

          <div>
            <label className="block text-gray-700 mb-2">გაიმეორეთ პაროლი</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="გაიმეორეთ პაროლი"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
              minLength={6}
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading || !token}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 transition"
          >
            {loading ? 'იცვლება...' : 'პაროლის შეცვლა'}
          </button>
        </form>

        <p className="text-center text-gray-500 mt-6">
          <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium">
            შესვლის გვერდზე დაბრუნება
          </Link>
        </p>
      </div>
    </div>
  )
}
