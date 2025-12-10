import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

export const authOptions: NextAuthOptions = {
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

