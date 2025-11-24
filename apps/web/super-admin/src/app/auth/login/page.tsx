'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Input, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@saas-platform/ui'
import { toast } from 'sonner'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Simple authentication check
      // In production, use proper API with bcrypt verification
      if (email === 'admin@platform.ge' && password === 'admin123') {
        // Store auth token in localStorage
        localStorage.setItem('super-admin-auth', JSON.stringify({
          email: 'admin@platform.ge',
          role: 'SUPER_ADMIN',
          authenticated: true,
          timestamp: Date.now()
        }))
        
        toast.success('წარმატებით შეხვედით!')
        router.push('/')
      } else {
        toast.error('არასწორი ელ.ფოსტა ან პაროლი')
      }
    } catch (error) {
      toast.error('შეცდომა შესვლისას')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Super Admin</CardTitle>
          <CardDescription className="text-center">
            შედით თქვენს ანგარიშში
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                ელ.ფოსტა
              </label>
              <Input
                id="email"
                type="email"
                placeholder="admin@platform.ge"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                პაროლი
              </label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? 'იტვირთება...' : 'შესვლა'}
            </Button>
          </form>
          <div className="mt-4 text-sm text-center text-gray-500 dark:text-gray-400">
            <p>ტესტ ანგარიში:</p>
            <p className="font-mono">admin@platform.ge / admin123</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

