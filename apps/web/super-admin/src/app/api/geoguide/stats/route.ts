import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [
      totalMuseums,
      totalTours,
      totalStops,
      totalCodes,
      activeCodes,
      redeemedCodes,
      totalDevices,
      activeEntitlements,
    ] = await Promise.all([
      prisma.museum.count(),
      prisma.tour.count(),
      prisma.tourStop.count(),
      prisma.activationCode.count(),
      prisma.activationCode.count({ where: { status: "AVAILABLE" } }),
      prisma.activationCode.count({ where: { status: "REDEEMED" } }),
      prisma.device.count(),
      prisma.entitlement.count({
        where: {
          isActive: true,
          expiresAt: { gt: new Date() },
        },
      }),
    ]);

    return NextResponse.json({
      totalMuseums,
      totalTours,
      totalStops,
      totalCodes,
      activeCodes,
      redeemedCodes,
      totalDevices,
      activeEntitlements,
    });
  } catch (error) {
    console.error("Error fetching GeoGuide stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
