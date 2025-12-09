'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/'
  
  const [credentials, setCredentials] = useState({ 
    hotelCode: '', 
    email: '', 
    password: '' 
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    
    if (!credentials.hotelCode || !credentials.email || !credentials.password) {
      setError('შეავსეთ ყველა ველი')
      setLoading(false)
      return
    }
    
    try {
      const result = await signIn('credentials', {
        hotelCode: credentials.hotelCode,
        email: credentials.email,
        password: credentials.password,
        redirect: false,
      })
      
      if (result?.error) {
        setError('არასწორი მონაცემები. შეამოწმეთ სასტუმროს კოდი, ელ-ფოსტა და პაროლი.')
        setLoading(false)
      } else if (result?.ok) {
        // Clear any old localStorage data
        localStorage.removeItem('currentUser')
        localStorage.removeItem('hotelRooms')
        localStorage.removeItem('hotelFolios')
        
        router.push(callbackUrl)
        router.refresh()
      }
    } catch (err) {
      setError('სისტემური შეცდომა. სცადეთ თავიდან.')
      setLoading(false)
    }
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">🏨 Hotel System</h1>
          <p className="text-gray-500 mt-2">შესვლა სისტემაში</p>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              სასტუმროს კოდი
            </label>
            <input
              type="text"
              value={credentials.hotelCode}
              onChange={(e) => {
                // Allow only digits, max 4
                const value = e.target.value.replace(/\D/g, '').slice(0, 4)
                setCredentials({...credentials, hotelCode: value})
              }}
              className="w-full px-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center text-2xl tracking-widest font-mono"
              placeholder="0000"
              maxLength={4}
              required
              disabled={loading}
            />
            <p className="text-xs text-gray-400 mt-1 text-center">4 ნიშნა კოდი რომელიც მიიღეთ რეგისტრაციისას</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ელ-ფოსტა
            </label>
            <input
              type="email"
              value={credentials.email}
              onChange={(e) => setCredentials({...credentials, email: e.target.value})}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="your@email.com"
              required
              disabled={loading}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              პაროლი
            </label>
            <input
              type="password"
              value={credentials.password}
              onChange={(e) => setCredentials({...credentials, password: e.target.value})}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="••••••••"
              required
              disabled={loading}
            />
          </div>
          
          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {loading ? 'იტვირთება...' : 'შესვლა'}
          </button>
        </form>
        
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>არ გაქვთ ანგარიში?</p>
          <a 
            href="/auth/signup?module=hotel" 
            className="text-blue-600 hover:underline font-medium"
          >
            დარეგისტრირდით აქ
          </a>
        </div>
      </div>
    </div>
  )
}
