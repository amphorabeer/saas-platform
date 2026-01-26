import NextAuth, { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import prisma from "@/lib/prisma"

export const authOptions: NextAuthOptions = {
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
        if (!credentials?.email || !credentials?.password || !credentials?.hotelCode) {
          throw new Error("Invalid credentials")
        }
        
        try {
          console.log('🔍 Searching for organization with hotelCode:', credentials.hotelCode)
          
          // Find organization by hotelCode
          const organization = await prisma.organization.findUnique({
            where: { hotelCode: credentials.hotelCode },
          })
          
          console.log('🏢 Organization found:', organization ? 'Yes' : 'No')
          
          if (!organization) {
            throw new Error("Invalid hotel code")
          }
          
          // Find user with organizationId and email
          const user = await prisma.user.findFirst({
            where: { 
              organizationId: organization.id,
              email: credentials.email
            },
            include: { organization: true },
          })
          
console.log('👤 User found:', user ? 'Yes' : 'No')

if (!user) throw new Error("Invalid credentials")

console.log('🔑 Checking password...')
console.log('🔑 User password hash:', user.password ? user.password.substring(0, 30) + '...' : 'NULL')
console.log('🔑 Input password:', credentials.password)

const isPasswordValid = await bcrypt.compare(credentials.password, user.password || '')
console.log('🔑 Password valid:', isPasswordValid)

if (!isPasswordValid) throw new Error("Invalid password")
          
          console.log('✅ Authentication successful for:', user.email)
          
          return {
            id: user.id,
            email: user.email,
            name: user.name || '',
            role: user.role,
            organizationId: user.organizationId,
            hotelCode: organization.hotelCode,
            tenantId: organization.tenantId,
          }
        } catch (error) {
          console.error('Auth error:', error)
          throw error
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

export default NextAuth(authOptions)