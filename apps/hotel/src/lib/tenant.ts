import { NextResponse } from "next/server";

export async function getTenantId() {
  // Lazy import everything to prevent build-time evaluation
  const { getServerSession } = await import("next-auth");
  const { getAuthOptions } = await import("@/lib/auth");
  const authOptions = await getAuthOptions();
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return null;
  }
  
  return (session.user as any).tenantId || null;
}

// Get Organization ID (the actual database ID, not tenantId)
export async function getOrganizationId() {
  const { getServerSession } = await import("next-auth");
  const { getAuthOptions } = await import("@/lib/auth");
  const authOptions = await getAuthOptions();
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return null;
  }
  
  return (session.user as any).organizationId || null;
}

export function unauthorizedResponse() {
  return NextResponse.json(
    { error: "Unauthorized: No tenant ID" },
    { status: 401 }
  );
}