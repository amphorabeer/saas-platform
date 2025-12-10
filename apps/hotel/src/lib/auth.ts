import type { NextAuthOptions } from "next-auth"

// Export function instead of object to enable lazy loading
export async function getAuthOptions(): Promise<NextAuthOptions> {
  const CredentialsProvider = (await import("next-auth/providers/credentials")).default
  const bcrypt = (await import("bcryptjs")).default
  const { getPrismaClient } = await import('./prisma')
  
  return {
    session: {
      strategy: "jwt",
      maxAge: 30 * 24 * 60 * 60,
    },
    providers: [
      CredentialsProvider({
        name: "credentials",
        credentials: {
          hotelCode: { label: "Hotel Code", type: "text" },
          email: { label: "Email", type: "email" },
          password: { label: "Password", type: "password" },
        },
        async authorize(credentials) {
          if (!credentials?.email || !credentials?.password) {
            throw new Error("Invalid credentials")
          }
          
          const prisma = getPrismaClient()
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
            include: { organization: true },
          })
          
          if (!user) {
            throw new Error("Invalid credentials")
          }
          
          if (credentials.hotelCode) {
            if (!user.organization || user.organization.hotelCode !== credentials.hotelCode) {
              throw new Error("Invalid credentials")
            }
          }
          
          const isPasswordValid = await bcrypt.compare(credentials.password, user.password)
          if (!isPasswordValid) {
            throw new Error("Invalid credentials")
          }
          
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            organizationId: user.organizationId,
            tenantId: user.organization?.tenantId,
            hotelCode: user.organization?.hotelCode,
          }
        },
      }),
    ],
    callbacks: {
      async jwt({ token, user }) {
        if (user) {
          token.id = user.id
          token.role = (user as any).role
          token.organizationId = (user as any).organizationId
          token.tenantId = (user as any).tenantId
          token.hotelCode = (user as any).hotelCode
        }
        return token
      },
      async session({ session, token }) {
        if (session?.user) {
          (session.user as any).id = token.id;
          (session.user as any).role = token.role;
          (session.user as any).organizationId = token.organizationId;
          (session.user as any).tenantId = token.tenantId;
          (session.user as any).hotelCode = token.hotelCode
        }
        return session
      },
    },
    pages: {
      signIn: "/login",
      error: "/login",
    },
  }
}

// For backward compatibility - synchronous version with minimal config
export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  providers: [],
  pages: { signIn: "/login" },
}
