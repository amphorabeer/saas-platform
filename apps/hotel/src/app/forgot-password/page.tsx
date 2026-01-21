'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [hotelCode, setHotelCode] = useState('')
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
        body: JSON.stringify({ email, hotelCode }),
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
      <div className="min-h-screen bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl max-w-md w-full text-center shadow-xl">
          <div className="text-6xl mb-4">📧</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">შეამოწმეთ ელ-ფოსტა</h2>
          <p className="text-gray-600 mb-6">
            თუ ეს ელ-ფოსტა რეგისტრირებულია, მიიღებთ პაროლის აღდგენის ბმულს.
          </p>
          <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium">
            შესვლის გვერდზე დაბრუნება
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-xl max-w-md w-full shadow-xl">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">🏨 Hotel System</h1>
        <p className="text-gray-500 mb-6">პაროლის აღდგენა</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-700 mb-2">სასტუმროს კოდი</label>
            <input
              type="text"
              value={hotelCode}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 4)
                setHotelCode(value)
              }}
              placeholder="0000"
              className="w-full px-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center text-2xl tracking-widest font-mono"
              maxLength={4}
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 mb-2">ელ-ფოსტა</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 transition"
          >
            {loading ? 'იგზავნება...' : 'აღდგენის ბმულის გაგზავნა'}
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
