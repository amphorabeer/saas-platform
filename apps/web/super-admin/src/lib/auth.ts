// Simple authentication utilities
// In production, use proper session management or NextAuth

export interface AuthUser {
  email: string
  role: string
  authenticated: boolean
  timestamp: number
}

export function getAuth(): AuthUser | null {
  if (typeof window === 'undefined') return null
  
  try {
    const authData = localStorage.getItem('super-admin-auth')
    if (!authData) return null
    
    const auth: AuthUser = JSON.parse(authData)
    
    // Check if auth is expired (24 hours)
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000
    if (Date.now() - auth.timestamp > TWENTY_FOUR_HOURS) {
      localStorage.removeItem('super-admin-auth')
      return null
    }
    
    return auth
  } catch {
    return null
  }
}

export function isAuthenticated(): boolean {
  const auth = getAuth()
  return auth?.authenticated === true
}

export function logout(): void {
  localStorage.removeItem('super-admin-auth')
  window.location.href = '/auth/login'
}

