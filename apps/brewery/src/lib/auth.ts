import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

// Lazy load Prisma to avoid build-time issues
let prisma: PrismaClient | null = null
function getPrisma() {
  if (!prisma) {
    prisma = new PrismaClient()
  }
  return prisma
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        tenantCode: { label: 'Tenant Code', type: 'text' },
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Invalid credentials')
        }

        try {
          const prisma = getPrisma()
          
          // Find tenant by code if provided
          let tenant = null
          if (credentials.tenantCode) {
            tenant = await prisma.tenant.findUnique({
              where: { code: credentials.tenantCode },
            })

            if (!tenant || !tenant.isActive) {
              throw new Error('Invalid tenant code')
            }
          }

          // Find user by email and tenant
          const user = await prisma.user.findFirst({
            where: {
              email: credentials.email,
              ...(tenant ? { tenantId: tenant.id } : {}),
              isActive: true,
            },
            include: {
              tenant: true,
            },
          })

          if (!user) {
            throw new Error('Invalid credentials')
          }

          // If tenant code was provided, verify it matches user's tenant
          if (credentials.tenantCode && user.tenantId !== tenant?.id) {
            throw new Error('Invalid tenant code')
          }

          // Verify password
          if (!user.password) {
            throw new Error('Password not set')
          }

          const isPasswordValid = await bcrypt.compare(credentials.password, user.password)
          if (!isPasswordValid) {
            throw new Error('Invalid credentials')
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            tenantId: user.tenantId,
            tenant: {
              id: user.tenant.id,
              name: user.tenant.name,
              code: user.tenant.code,
              slug: user.tenant.slug,
            },
          }
        } catch (error) {
          console.error('[Auth] Error:', error)
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
        token.tenantId = (user as any).tenantId
        token.tenant = (user as any).tenant
      }
      return token
    },
    async session({ session, token }) {
      if (session?.user) {
        ;(session.user as any).id = token.id
        ;(session.user as any).role = token.role
        ;(session.user as any).tenantId = token.tenantId
        ;(session.user as any).tenant = token.tenant
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
}
