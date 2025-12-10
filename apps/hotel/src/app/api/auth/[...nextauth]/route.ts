export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'

// Check if we're in build phase
const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build'

async function handler(req: any, context: any) {
  // During build, return empty response
  if (isBuildPhase) {
    return NextResponse.json({ message: 'Build phase' })
  }
  
  // Lazy import everything at runtime
  const NextAuth = (await import("next-auth")).default
  const { getAuthOptions } = await import("@/lib/auth")
  const authOptions = await getAuthOptions()
  return NextAuth(req, context, authOptions)
}

export { handler as GET, handler as POST }





