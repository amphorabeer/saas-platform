import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const deviceId = searchParams.get("deviceId");
  const tourId = searchParams.get("tourId");
  const type = searchParams.get("type"); // "audio" | "vr360"
  const museumId = searchParams.get("museumId");

  if (!deviceId) return NextResponse.json({ hasAccess: false });

  try {
    const device = await prisma.device.findUnique({ where: { deviceId } });
    if (!device) return NextResponse.json({ hasAccess: false });

    // When type is "vr360", check for VR-specific entitlements
    if (type === "vr360" && museumId) {
      const vrEntitlement = await prisma.entitlement.findFirst({
        where: {
          deviceId: device.id,
          isActive: true,
          expiresAt: { gt: new Date() },
          type: "VR360",
          tour: { museumId },
        },
      });
      return NextResponse.json({ hasAccess: !!vrEntitlement });
    }

    // When museumId is set (no type or type=audio), check for any audio entitlement for this museum
    if (museumId && type !== "vr360") {
      const audioEntitlements = await prisma.entitlement.findMany({
        where: {
          deviceId: device.id,
          isActive: true,
          expiresAt: { gt: new Date() },
          type: "AUDIO",
          tour: { museumId },
        },
        select: { tourId: true },
      });
      return NextResponse.json({
        hasAccess: audioEntitlements.length > 0,
        tourIds: audioEntitlements.map((e) => e.tourId),
      });
    }

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
    const tourIds = entitlements.map((e) => e.tourId);
    return NextResponse.json({ hasAccess: tourIds.length > 0, tourIds });
  } catch (error) {
    console.error("[Entitlement Check] Error:", error);
    return NextResponse.json({ hasAccess: false });
  }
}
