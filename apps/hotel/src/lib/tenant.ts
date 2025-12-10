import { getServerSession } from "next-auth";
import { authOptions } from "@saas-platform/auth";
import { NextResponse } from "next/server";

export async function getTenantId() {
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





