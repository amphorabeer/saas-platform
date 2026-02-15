import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

export interface SessionTenant {
  userId: string;
  tenantId: string;
  storeId: string;
  role: string;
  employeeId?: string;
}

export async function getCurrentTenant(): Promise<SessionTenant | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  const u = session.user as { id?: string; tenantId?: string; storeId?: string; role?: string; employeeId?: string };
  if (!u.id || !u.tenantId || !u.storeId) return null;
  return {
    userId: u.id,
    tenantId: u.tenantId,
    storeId: u.storeId,
    role: u.role ?? "STORE_CASHIER",
    employeeId: u.employeeId,
  };
}
