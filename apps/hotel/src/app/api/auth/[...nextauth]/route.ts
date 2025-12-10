export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

async function handler(req: any, context: any) {
  // Lazy import everything to prevent build-time evaluation
  const NextAuth = (await import("next-auth")).default
  const { getAuthOptions } = await import("@/lib/auth")
  const authOptions = await getAuthOptions()
  return NextAuth(req, context, authOptions)
}

export { handler as GET, handler as POST }





