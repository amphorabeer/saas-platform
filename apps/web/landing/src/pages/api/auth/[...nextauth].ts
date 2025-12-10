import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"

export const authOptions = {
  session: {
    strategy: "jwt" as const,
    maxAge: 30 * 24 * 60 * 60,
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }
        
        try {
          const { PrismaClient } = require('@prisma/client')
          const bcrypt = require('bcryptjs')
          const prisma = new PrismaClient()
          
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
            include: { organization: true },
          })
          
          await prisma.$disconnect()
          
          if (!user) return null
          
          const isValid = await bcrypt.compare(credentials.password, user.password)
          if (!isValid) return null
          
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            organizationId: user.organizationId,
          }
        } catch (error) {
          console.error('Auth error:', error)
          return null
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }: any) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.organizationId = user.organizationId
      }
      return token
    },
    async session({ session, token }: any) {
      if (session?.user) {
        session.user.id = token.id
        session.user.role = token.role
        session.user.organizationId = token.organizationId
      }
      return session
    },
  },
  pages: {
    signIn: "/auth/login",
    error: "/auth/login",
  },
}

export default NextAuth(authOptions)

