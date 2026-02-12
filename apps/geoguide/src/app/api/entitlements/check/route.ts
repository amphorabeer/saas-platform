import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const deviceId = searchParams.get("deviceId");
  const tourId = searchParams.get("tourId");

  if (!deviceId) return NextResponse.json({ hasAccess: false });

  try {
    const device = await prisma.device.findUnique({ where: { deviceId } });
    if (!device) return NextResponse.json({ hasAccess: false });

    const where: any = {
      deviceId: device.id,
      isActive: true,
      expiresAt: { gt: new Date() },
    };
    if (tourId) where.tourId = tourId;

    const entitlements = await prisma.entitlement.findMany({
      where,
      select: { tourId: true, expiresAt: true },
    });

    if (tourId) {
      return NextResponse.json({ hasAccess: entitlements.length > 0 });
    }

    // Return all active tourIds
    const tourIds = entitlements.map(e => e.tourId);
    return NextResponse.json({ hasAccess: tourIds.length > 0, tourIds });
  } catch (error) {
    console.error("[Entitlement Check] Error:", error);
    return NextResponse.json({ hasAccess: false });
  }
}
