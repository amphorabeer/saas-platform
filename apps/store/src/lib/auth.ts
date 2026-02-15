import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

declare module "next-auth" {
  interface User {
    id: string;
    email: string;
    name: string;
    tenantId: string;
    storeId: string;
    role: string;
    employeeId?: string;
  }
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      tenantId: string;
      storeId: string;
      role: string;
      employeeId?: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    tenantId: string;
    storeId: string;
    role: string;
    employeeId?: string;
  }
}

export const authOptions: NextAuthOptions = {
    session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
    providers: [
      CredentialsProvider({
        name: "credentials",
        credentials: {
          storeCode: { label: "Store Code", type: "text" },
          email: { label: "Email", type: "email" },
          password: { label: "Password", type: "password" },
        },
        async authorize(credentials) {
          if (
            !credentials?.storeCode ||
            !credentials?.email ||
            !credentials?.password
          ) {
            throw new Error("შეავსეთ ყველა ველი");
          }

          const storeCodeInput = String(credentials.storeCode)
            .replace(/\D/g, "")
            .slice(0, 4);

          const organization = await prisma.organization.findFirst({
            where: { storeCode: storeCodeInput },
          });

          if (!organization) {
            throw new Error("შეამოწმეთ მაღაზიის კოდი");
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

          if (!user) throw new Error("არასწორი ელ-ფოსტა ან პაროლი");
          if (!user.password)
            throw new Error(
              "პაროლი არ არის დაყენებული. გთხოვთ დაუკავშირდეთ ადმინისტრატორს."
            );

          const valid = await bcrypt.compare(credentials.password, user.password);
          if (!valid) throw new Error("არასწორი ელ-ფოსტა ან პაროლი");

          const employee = await prisma.storeEmployee.findFirst({
            where: { userId: user.id, isActive: true },
            include: { store: true },
          });

          if (!employee) {
            throw new Error(
              "თქვენ არ გაქვთ წვდომა მაღაზიაზე. გთხოვთ დაუკავშირდეთ ადმინისტრატორს."
            );
          }
          if (employee.store.tenantId !== organization.tenantId) {
            throw new Error("თქვენ არ გაქვთ წვდომა ამ მაღაზიაზე.");
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name ?? "",
            tenantId: organization.tenantId,
            storeId: employee.storeId,
            role: employee.role,
            employeeId: employee.id,
          };
        },
      }),
    ],
    callbacks: {
      async jwt({ token, user }) {
        if (user) {
          token.id = user.id;
          token.tenantId = (user as { tenantId?: string }).tenantId ?? "";
          token.storeId = (user as { storeId?: string }).storeId ?? "";
          token.role = (user as { role?: string }).role ?? "STORE_CASHIER";
          token.employeeId = (user as { employeeId?: string }).employeeId;
        }
        return token;
      },
      async session({ session, token }) {
        if (session?.user) {
          (session.user as { id: string }).id = token.id;
          (session.user as { tenantId: string }).tenantId = token.tenantId;
          (session.user as { storeId: string }).storeId = token.storeId;
          (session.user as { role: string }).role = token.role;
          (session.user as { employeeId?: string }).employeeId = token.employeeId;
        }
        return session;
      },
    },
    pages: { signIn: "/login", error: "/login" },
};

export async function getAuthOptions(): Promise<NextAuthOptions> {
  return authOptions;
}
