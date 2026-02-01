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
      totalPayments,
      completedPayments,
      totalRevenue,
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
      prisma.payment.count(),
      prisma.payment.count({ where: { status: "COMPLETED" } }),
      prisma.payment.aggregate({
        where: { status: "COMPLETED" },
        _sum: { amount: true },
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
      totalPayments,
      completedPayments,
      totalRevenue: Number(totalRevenue._sum.amount || 0),
    });
  } catch (error) {
    console.error("Error fetching GeoGuide stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}