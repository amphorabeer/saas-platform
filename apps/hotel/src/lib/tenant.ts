import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function getTenantId() {
  // Lazy import to prevent build-time evaluation
  const { authOptions } = await import("@/lib/auth");
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return null;
  }
  
  const tenantId = (session.user as any).tenantId;
  
  if (!tenantId) {
    return null;
  }
  
  return tenantId;
}

export function unauthorizedResponse() {
  return NextResponse.json(
    { error: "Unauthorized: No tenant ID" },
    { status: 401 }
  );
}





