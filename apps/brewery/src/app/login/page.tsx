'use client'

import { useState, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/'
  
  const [credentials, setCredentials] = useState({
    tenantCode: '',
    email: '',
    password: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    
    if (!credentials.tenantCode || !credentials.email || !credentials.password) {
      setError('შეავსეთ ყველა ველი')
      setLoading(false)
      return
    }
    
    try {
      const result = await signIn('credentials', {
        tenantCode: credentials.tenantCode,
        email: credentials.email,
        password: credentials.password,
        redirect: false,
      })
      
      if (result?.error) {
        setError('არასწორი მონაცემები. შეამოწმეთ კოდი, ელ-ფოსტა და პაროლი.')
      } else if (result?.ok) {
        router.push(callbackUrl)
        router.refresh()
      }
    } catch (err) {
      setError('სისტემური შეცდომა. სცადეთ თავიდან.')
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="w-full max-w-md">
        <div className="bg-slate-800 rounded-xl shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white">🍺 BrewMaster PRO</h1>
            <p className="text-slate-400 mt-2">შესვლა სისტემაში</p>
          </div>
          
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                კომპანიის კოდი
              </label>
              <input
                type="text"
                value={credentials.tenantCode}
                onChange={(e) => {
                  // Format: BREW-XXXX (uppercase, auto-format)
                  const value = e.target.value.toUpperCase().replace(/[^BREW0-9-]/g, '')
                  // Auto-format: BREW-XXXX
                  let formatted = value
                  if (value.startsWith('BREW') && !value.includes('-') && value.length > 4) {
                    formatted = `BREW-${value.slice(4)}`
                  }
                  setCredentials({ ...credentials, tenantCode: formatted.slice(0, 9) })
                }}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 text-center text-xl tracking-widest font-mono"
                placeholder="BREW-0000"
                maxLength={9}
                required
                disabled={loading}
              />
              <p className="text-xs text-slate-400 mt-1 text-center">
                4 ნიშნა კოდი რომელიც მიიღეთ რეგისტრაციისას
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                ელ-ფოსტა
              </label>
              <input
                type="email"
                value={credentials.email}
                onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
                placeholder="your@email.com"
                required
                disabled={loading}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                პაროლი
              </label>
              <input
                type="password"
                value={credentials.password}
                onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
                placeholder="••••••••"
                required
                disabled={loading}
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-medium rounded-lg hover:from-amber-600 hover:to-amber-700 transition-all disabled:opacity-50"
            >
              {loading ? 'იტვირთება...' : 'შესვლა'}
            </button>
          </form>
          
          <div className="mt-6 text-center text-sm text-slate-400">
            <p>არ გაქვთ ანგარიში?</p>
            <Link href="/register" className="text-amber-400 hover:underline font-medium">
              დარეგისტრირდით აქ
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}









