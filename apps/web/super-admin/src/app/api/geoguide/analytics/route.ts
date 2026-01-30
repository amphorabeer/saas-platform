import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/geoguide/analytics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "30d";

    // Calculate date range
    let startDate: Date | null = null;
    const now = new Date();

    switch (period) {
      case "7d":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "90d":
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = null;
    }

    // Codes statistics
    const codesStats = await prisma.activationCode.groupBy({
      by: ["status"],
      _count: { status: true },
    });

    const codes = {
      total: 0,
      available: 0,
      redeemed: 0,
      expired: 0,
      revoked: 0,
      redemptionRate: 0,
    };

    codesStats.forEach((stat) => {
      codes.total += stat._count.status;
      switch (stat.status) {
        case "AVAILABLE":
          codes.available = stat._count.status;
          break;
        case "REDEEMED":
          codes.redeemed = stat._count.status;
          break;
        case "EXPIRED":
          codes.expired = stat._count.status;
          break;
        case "REVOKED":
          codes.revoked = stat._count.status;
          break;
      }
    });

    codes.redemptionRate =
      codes.total > 0 ? (codes.redeemed / codes.total) * 100 : 0;

    // Devices statistics
    const totalDevices = await prisma.device.count();
    const activeLastWeek = await prisma.device.count({
      where: {
        lastActiveAt: {
          gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        },
      },
    });
    const activeLastMonth = await prisma.device.count({
      where: {
        lastActiveAt: {
          gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        },
      },
    });

    const platformStats = await prisma.device.groupBy({
      by: ["platform"],
      _count: { platform: true },
    });

    const devices = {
      total: totalDevices,
      activeLastWeek,
      activeLastMonth,
      byPlatform: platformStats.map((p) => ({
        platform: p.platform || "unknown",
        count: p._count.platform,
      })),
    };

    // Museums statistics
    const totalMuseums = await prisma.museum.count();
    const publishedMuseums = await prisma.museum.count({
      where: { isPublished: true },
    });
    const totalTours = await prisma.tour.count();
    const publishedTours = await prisma.tour.count({
      where: { isPublished: true },
    });

    const museums = {
      total: totalMuseums,
      published: publishedMuseums,
      totalTours,
      publishedTours,
    };

    // Activations by date
    const entitlements = await prisma.entitlement.findMany({
      where: startDate ? { activatedAt: { gte: startDate } } : {},
      select: {
        activatedAt: true,
      },
      orderBy: { activatedAt: "asc" },
    });

    // Group by date
    const activationsByDateMap = new Map<string, number>();
    
    // Initialize all dates in range
    const daysCount = period === "7d" ? 7 : period === "30d" ? 30 : period === "90d" ? 90 : 30;
    for (let i = daysCount - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split("T")[0];
      activationsByDateMap.set(dateStr, 0);
    }

    entitlements.forEach((e) => {
      const dateStr = e.activatedAt.toISOString().split("T")[0];
      if (activationsByDateMap.has(dateStr)) {
        activationsByDateMap.set(dateStr, (activationsByDateMap.get(dateStr) || 0) + 1);
      }
    });

    const activationsByDate = Array.from(activationsByDateMap.entries()).map(
      ([date, count]) => ({ date, count })
    );

    // Top Museums by activations
    const topMuseumsData = await prisma.entitlement.groupBy({
      by: ["tourId"],
      _count: { tourId: true },
      orderBy: { _count: { tourId: "desc" } },
      take: 5,
    });

    const tourIds = topMuseumsData.map((t) => t.tourId);
    const toursWithMuseums = await prisma.tour.findMany({
      where: { id: { in: tourIds } },
      include: { museum: { select: { name: true } } },
    });

    // Aggregate by museum
    const museumActivations = new Map<string, number>();
    topMuseumsData.forEach((t) => {
      const tour = toursWithMuseums.find((tw) => tw.id === t.tourId);
      if (tour) {
        const current = museumActivations.get(tour.museum.name) || 0;
        museumActivations.set(tour.museum.name, current + t._count.tourId);
      }
    });

    const topMuseums = Array.from(museumActivations.entries())
      .map(([name, activations]) => ({ name, activations }))
      .sort((a, b) => b.activations - a.activations)
      .slice(0, 5);

    // Top Tours
    const topTours = topMuseumsData.slice(0, 5).map((t) => {
      const tour = toursWithMuseums.find((tw) => tw.id === t.tourId);
      return {
        name: tour?.name || "უცნობი",
        museum: tour?.museum.name || "უცნობი",
        activations: t._count.tourId,
      };
    });

    // Recent activations
    const recentEntitlements = await prisma.entitlement.findMany({
      take: 10,
      orderBy: { activatedAt: "desc" },
      include: {
        tour: {
          select: {
            name: true,
            museum: { select: { name: true } },
          },
        },
        activationCode: {
          select: { code: true },
        },
        device: {
          select: { platform: true },
        },
      },
    });

    const recentActivations = recentEntitlements.map((e) => ({
      code: e.activationCode?.code || "—",
      museum: e.tour.museum.name,
      tour: e.tour.name,
      platform: e.device.platform || "web",
      date: e.activatedAt.toISOString(),
    }));

    return NextResponse.json({
      codes,
      devices,
      museums,
      activationsByDate,
      topMuseums,
      topTours,
      recentActivations,
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
