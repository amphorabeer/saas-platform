import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from '@saas-platform/database'

export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },
  
  pages: {
    signIn: '/login',
    error: '/login',
  },
  
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        console.log('Auth attempt:', credentials?.email)
        
        if (!credentials?.email || !credentials?.password) {
          console.log('Missing credentials')
          throw new Error('Email and password required')
        }
        
        const user = await prisma.user.findFirst({
          where: { 
            email: credentials.email,
            isActive: true,
          },
          include: {
            tenant: {
              select: {
                id: true,
                name: true,
                slug: true,
                isActive: true,
              },
            },
          },
        })
        
        console.log('User found:', user?.email)
        
        if (!user) {
          console.log('User not found')
          throw new Error('Invalid credentials')
        }
        
        if (!user.tenant.isActive) {
          console.log('Tenant not active')
          throw new Error('Tenant is not active')
        }
        
        // Demo password check - accept "demo123" for all users
        if (credentials.password !== 'demo123') {
          console.log('Invalid password')
          throw new Error('Invalid credentials')
        }
        
        console.log('Auth successful:', user.email)
        
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          tenantId: user.tenantId,
          tenantName: user.tenant.name,
          tenantSlug: user.tenant.slug,
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
        token.tenantName = (user as any).tenantName
        token.tenantSlug = (user as any).tenantSlug
      }
      return token
    },
    
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.tenantId = token.tenantId as string
        session.user.tenantName = token.tenantName as string
        session.user.tenantSlug = token.tenantSlug as string
      }
      return session
    },
  },
  
  debug: process.env.NODE_ENV === 'development',
}



















