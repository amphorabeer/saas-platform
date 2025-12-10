export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import NextAuth from "next-auth";
import { getAuthOptions } from "@saas-platform/auth";

async function handler(req: any, context: any) {
  const authOptions = await getAuthOptions();
  return NextAuth(req, context, authOptions);
}

export { handler as GET, handler as POST };





