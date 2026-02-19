import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt', maxAge: 24 * 60 * 60 },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        restCode: { label: 'Rest Code', type: 'text' },
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        console.log('=== AUTHORIZE CALLED ===', JSON.stringify(credentials));
        if (!credentials?.restCode || !credentials?.email || !credentials?.password) {
          throw new Error('შეავსეთ ყველა ველი');
        }

        const restCodeInput = String(credentials.restCode)
          .replace(/\D/g, '')
          .slice(0, 4);

        let organization;
        try {
          organization = await prisma.organization.findFirst({
            where: { restCode: restCodeInput },
          });
          console.log('authorize - organization:', organization);
        } catch (err) {
          console.error('=== PRISMA ERROR ===', err);
          throw new Error('Database connection error');
        }
        console.log('authorize - restaurant query tenantId:', organization?.tenantId);

        if (!organization) {
          throw new Error('შეამოწმეთ რესტორნის კოდი');
        }

        const user = await prisma.user.findFirst({
          where: {
            email: credentials.email.trim().toLowerCase(),
            organizationId: organization.id,
          },
          select: {
            id: true,
            email: true,
            name: true,
            password: true,
            organizationId: true,
          },
        });

        if (!user) throw new Error('არასწორი ელ-ფოსტა ან პაროლი');
        if (!user.password) {
          throw new Error('პაროლი არ არის დაყენებული. გთხოვთ დაუკავშირდეთ ადმინისტრატორს.');
        }

        const valid = await bcrypt.compare(credentials.password, user.password);
        if (!valid) throw new Error('არასწორი ელ-ფოსტა ან პაროლი');

        const restaurant = await prisma.restaurant.findFirst({
          where: { tenantId: organization.tenantId },
        });
        console.log('authorize - restaurant found:', restaurant);

        if (!restaurant) {
          throw new Error('რესტორნი ვერ მოიძებნა. გთხოვთ დაუკავშირდეთ ადმინისტრატორს.');
        }

        const employee = await prisma.restaurantEmployee.findFirst({
          where: { userId: user.id, restaurantId: restaurant.id, isActive: true },
        });

        if (!employee) {
          throw new Error(
            'თქვენ არ გაქვთ წვდომა ამ რესტორნზე. გთხოვთ დაუკავშირდეთ ადმინისტრატორს.'
          );
        }

        const result = {
          id: user.id,
          email: user.email,
          name: user.name ?? '',
          role: employee.role,
          tenantId: organization.tenantId,
          organizationId: organization.id,
          restaurantId: restaurant.id,
          employeeId: employee.id,
          employeeRole: employee.role,
          restCode: restCodeInput,
        };
        console.log('[auth] authorize return restaurantId:', result.restaurantId);
        return result;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role ?? 'WAITER';
        token.tenantId = (user as { tenantId?: string }).tenantId ?? '';
        token.organizationId = (user as { organizationId?: string }).organizationId ?? '';
        token.restaurantId = (user as { restaurantId?: string }).restaurantId ?? '';
        token.employeeId = (user as { employeeId?: string }).employeeId ?? '';
        token.employeeRole = (user as { employeeRole?: string }).employeeRole ?? '';
        token.restCode = (user as { restCode?: string }).restCode ?? '';
        console.log('[auth] jwt callback token.restaurantId:', token.restaurantId);
      }
      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        (session.user as { id: string }).id = token.id;
        (session.user as { role: string }).role = token.role;
        (session.user as { tenantId: string }).tenantId = token.tenantId;
        (session.user as { organizationId: string }).organizationId = token.organizationId;
        (session.user as { restaurantId: string }).restaurantId = token.restaurantId;
        (session.user as { employeeId: string }).employeeId = token.employeeId;
        (session.user as { employeeRole: string }).employeeRole = token.employeeRole;
        (session.user as { restCode: string }).restCode = token.restCode;
        console.log('[auth] session callback session.user.restaurantId:', (session.user as { restaurantId?: string }).restaurantId);
      }
      return session;
    },
  },
  pages: { signIn: '/login', error: '/login' },
};

export async function getAuthOptions(): Promise<NextAuthOptions> {
  return authOptions;
}
