import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

// Lazy load Prisma to avoid build-time initialization
async function getPrisma() {
  // Skip during build
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return new Proxy({}, {
      get: () => () => Promise.resolve(null)
    }) as any;
  }
  
  const { getPrisma: getDbPrisma } = await import("@saas-platform/database");
  return getDbPrisma();
}

// Create a lazy adapter that only initializes when used
async function createLazyAdapter() {
  // Skip during build
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return new Proxy({}, {
      get: () => () => Promise.resolve(null)
    }) as any;
  }
  
  const { PrismaAdapter } = await import("@auth/prisma-adapter");
  const prisma = await getPrisma();
  return PrismaAdapter(prisma) as any;
}

export async function getAuthOptions(): Promise<NextAuthOptions> {
  const adapter = await createLazyAdapter();
  
  return {
    adapter,
    session: {
      strategy: "jwt",
      maxAge: 30 * 24 * 60 * 60, // 30 days
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
          console.log('🔐 Login attempt:', { 
            hotelCode: credentials?.hotelCode, 
            email: credentials?.email 
          });

          if (!credentials?.email || !credentials?.password) {
            console.log('❌ Missing email or password');
            throw new Error("Invalid credentials");
          }

          // Lazy load Prisma inside authorize function
          const prisma = await getPrisma();
          
          // Find user by email
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
            include: { organization: true },
          });

        if (!user) {
          console.log('❌ User not found:', credentials.email);
          throw new Error("Invalid credentials");
        }

        // Verify hotel code if provided (required for hotel app)
        if (credentials.hotelCode) {
          if (!user.organization) {
            console.log('❌ User has no organization');
            throw new Error("Invalid credentials");
          }
          
          if (user.organization.hotelCode !== credentials.hotelCode) {
            console.log('❌ Hotel code mismatch:', {
              provided: credentials.hotelCode,
              expected: user.organization.hotelCode
            });
            throw new Error("Invalid credentials");
          }
          console.log('✅ Hotel code verified:', credentials.hotelCode);
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(credentials.password, user.password);
        if (!isPasswordValid) {
          console.log('❌ Invalid password for:', credentials.email);
          throw new Error("Invalid credentials");
        }

        console.log('✅ Login successful:', {
          userId: user.id,
          email: user.email,
          hotelCode: user.organization?.hotelCode
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          organizationId: user.organizationId,
          tenantId: user.organization?.tenantId,
          hotelCode: user.organization?.hotelCode,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.organizationId = user.organizationId;
        token.tenantId = (user as any).tenantId;
        token.hotelCode = (user as any).hotelCode;
      }
      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).organizationId = token.organizationId;
        (session.user as any).tenantId = token.tenantId;
        (session.user as any).hotelCode = token.hotelCode;
      }
      return session;
    },
  },
    pages: {
      signIn: "/login",
      error: "/login",
    },
  };
}

// Backward compatibility - empty object for build-time
export const authOptions: NextAuthOptions = {
  providers: [],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
};
