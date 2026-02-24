import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: 'credentials',
      name: 'Credentials',
      credentials: {
        beautyCode: { label: 'Beauty Code', type: 'text' },
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('ელფოსტა და პაროლი სავალდებულოა');
        }

        // Find salon by beautyCode (slug ends with -CODE)
        let salonId: string | undefined;
        if (credentials.beautyCode) {
          const salon = await prisma.salon.findFirst({
            where: {
              slug: { endsWith: `-${credentials.beautyCode}` },
            },
          });
          if (!salon) {
            throw new Error('არასწორი სალონის კოდი');
          }
          salonId = salon.id;
        }

        // Find staff by email (and optionally salonId)
        const staff = await prisma.staff.findFirst({
          where: {
            email: credentials.email.toLowerCase(),
            isActive: true,
            ...(salonId ? { salonId } : {}),
          },
          include: { salon: true },
        });

        if (!staff || !staff.passwordHash) {
          throw new Error('არასწორი ელფოსტა ან პაროლი');
        }

        const isValid = await bcrypt.compare(credentials.password, staff.passwordHash);
        if (!isValid) {
          throw new Error('არასწორი ელფოსტა ან პაროლი');
        }

        return {
          id: staff.id,
          name: staff.name,
          email: staff.email,
          role: staff.role,
          salonId: staff.salonId,
          salonName: staff.salon.name,
        };
      },
    }),
    CredentialsProvider({
      id: 'pin',
      name: 'PIN',
      credentials: {
        salonId: { label: 'Salon ID', type: 'text' },
        pin: { label: 'PIN', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.salonId || !credentials?.pin) {
          throw new Error('PIN კოდი სავალდებულოა');
        }

        const staff = await prisma.staff.findFirst({
          where: {
            salonId: credentials.salonId,
            pin: credentials.pin,
            isActive: true,
          },
          include: {
            salon: true,
          },
        });

        if (!staff) {
          throw new Error('არასწორი PIN კოდი');
        }

        return {
          id: staff.id,
          name: staff.name,
          email: staff.email,
          role: staff.role,
          salonId: staff.salonId,
          salonName: staff.salon.name,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.salonId = (user as any).salonId;
        token.salonName = (user as any).salonName;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).salonId = token.salonId;
        (session.user as any).salonName = token.salonName;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET,
};
