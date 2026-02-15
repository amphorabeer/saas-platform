import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

/** Get storeId from session (for protected routes). Throws if not authenticated. */
export async function getSessionStoreId(): Promise<string> {
  const session = await getServerSession(authOptions);
  const storeId = (session?.user as { storeId?: string } | undefined)?.storeId;
  if (storeId) return storeId;
  throw new Error("არ არის ავტორიზებული. გთხოვთ შეხვიდეთ სისტემაში.");
}

/** Get storeId from session or fallback to default (for backwards compat / API routes). */
export async function getOrCreateDefaultStore(): Promise<string> {
  const session = await getServerSession(authOptions);
  const storeId = (session?.user as { storeId?: string } | undefined)?.storeId;
  if (storeId) return storeId;

  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) throw new Error("სესია არასწორია.");

  const user = await prisma.user.findFirst({
    where: { id: userId },
    select: { organizationId: true },
  });
  if (!user?.organizationId) throw new Error("ორგანიზაცია ვერ მოიძებნა.");

  const org = await prisma.organization.findFirst({
    where: { id: user.organizationId },
    select: { tenantId: true, id: true },
  });
  if (!org) throw new Error("ორგანიზაცია ვერ მოიძებნა.");

  let store = await prisma.store.findFirst({
    where: { tenantId: org.tenantId, isActive: true },
    select: { id: true },
  });
  if (store) return store.id;

  store = await prisma.store.create({
    data: {
      tenantId: org.tenantId,
      name: "ძირითადი მაღაზია",
      slug: `store-${org.id.slice(0, 8)}-${Date.now()}`,
      currency: "GEL",
      timezone: "Asia/Tbilisi",
    },
    select: { id: true },
  });
  return store.id;
}
