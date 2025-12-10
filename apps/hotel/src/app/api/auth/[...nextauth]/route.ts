export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import NextAuth from "next-auth";

async function handler(req: any, context: any) {
  // Lazy import to prevent build-time evaluation
  const { authOptions } = await import("@/lib/auth");
  return NextAuth(req, context, authOptions);
}

export { handler as GET, handler as POST };





