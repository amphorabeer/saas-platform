'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ActivityLogger } from '../../lib/activityLogger'

export default function LoginPage() {
  const router = useRouter()
  const [credentials, setCredentials] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  
  // Default users (in production use database)
  const users = [
    { id: 1, username: 'admin', password: 'admin123', role: 'admin', name: 'ადმინისტრატორი' },
    { id: 2, username: 'manager', password: 'manager123', role: 'manager', name: 'მენეჯერი' },
    { id: 3, username: 'reception', password: 'reception123', role: 'receptionist', name: 'რეცეფშენი' }
  ]
  
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    
    const user = users.find(
      u => u.username === credentials.username && u.password === credentials.password
    )
    
    if (user) {
      // Save to localStorage (in production use secure tokens)
      const userData = {
        id: user.id,
        username: user.username,
        role: user.role,
        name: user.name,
        loginTime: new Date().toISOString()
      }
      localStorage.setItem('currentUser', JSON.stringify(userData))
      
      ActivityLogger.log('LOGIN', { username: user.username })
      
      router.push('/')
    } else {
      setError('არასწორი მომხმარებელი ან პაროლი')
    }
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">🏨 Hotel System</h1>
          <p className="text-gray-500 mt-2">შესვლა სისტემაში</p>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              მომხმარებელი
            </label>
            <input
              type="text"
              value={credentials.username}
              onChange={(e) => setCredentials({...credentials, username: e.target.value})}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Username"
              required
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
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Password"
              required
            />
          </div>
          
          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}
          
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition"
          >
            შესვლა
          </button>
        </form>
        
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Demo Users:</p>
          <p className="text-xs mt-1">admin/admin123 | manager/manager123 | reception/reception123</p>
        </div>
      </div>
    </div>
  )
}

