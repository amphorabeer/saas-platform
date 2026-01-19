import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

/**
 * Get tenant ID from session
 */
export async function getTenantId(): Promise<string | null> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return null
    }
    return (session.user as any).tenantId || null
  } catch (error) {
    console.error('[getTenantId] Error:', error)
    return null
  }
}

/**
 * Return unauthorized response
 */
export function unauthorizedResponse() {
  return NextResponse.json(
    { error: 'Unauthorized: No tenant ID' },
    { status: 401 }
  )
}

/**
 * Generate unique tenant code in BREW-XXXX format
 */
export function generateTenantCode(): string {
  const randomDigits = Math.floor(1000 + Math.random() * 9000)
  return `BREW-${randomDigits}`
}

/**
 * Generate URL-friendly slug from company name
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50) // Limit length
}

/**
 * Validate tenant code format
 */
export function isValidTenantCode(code: string): boolean {
  return /^BREW-\d{4}$/.test(code)
}
