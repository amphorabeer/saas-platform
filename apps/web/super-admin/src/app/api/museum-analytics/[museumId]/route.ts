export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { museumId: string } }
) {
  try {
    const { museumId } = params;
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");
    const period = searchParams.get("period") || "30d";
    const dateFrom = searchParams.get("dateFrom") || null;
    const dateTo = searchParams.get("dateTo") || null;

    // Token validation
    if (!token) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const museum = await prisma.museum.findUnique({
      where: { id: museumId },
      select: {
        id: true,
        name: true,
        analyticsToken: true,
      },
    });

    if (!museum) {
      return NextResponse.json({ error: "Museum not found" }, { status: 404 });
    }

    if (!museum.analyticsToken || museum.analyticsToken !== token) {
      return NextResponse.json({ error: "Invalid token" }, { status: 403 });
    }

    // თარიღის range
    let startDate: Date | null = null;
    const now = new Date();

    if (dateFrom && dateTo) {
      startDate = new Date(dateFrom);
    } else if (period !== "all") {
      const days = parseInt(period.replace("d", ""));
      startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    }

    const dateFilter = startDate ? { gte: startDate } : undefined;

    // კოდების სტატისტიკა
    const codesStats = await prisma.activationCode.groupBy({
      by: ["status"],
      where: { museumId },
      _count: { status: true },
    });

    const codes = { total: 0, available: 0, redeemed: 0, expired: 0, revoked: 0, redemptionRate: 0 };
    codesStats.forEach((stat) => {
      codes.total += stat._count.status;
      switch (stat.status) {
        case "AVAILABLE": codes.available = stat._count.status; break;
        case "REDEEMED": codes.redeemed = stat._count.status; break;
        case "EXPIRED": codes.expired = stat._count.status; break;
        case "REVOKED": codes.revoked = stat._count.status; break;
      }
    });
    codes.redemptionRate = codes.total > 0 ? (codes.redeemed / codes.total) * 100 : 0;

    // ტოპ ტურები
    const topToursData = await prisma.entitlement.groupBy({
      by: ["tourId"],
      where: {
        tour: { museumId },
        ...(dateFilter ? { activatedAt: dateFilter } : {}),
      },
      _count: { tourId: true },
      orderBy: { _count: { tourId: "desc" } },
      take: 10,
    });

    const tourIds = topToursData.map((t) => t.tourId);
    const tours = await prisma.tour.findMany({
      where: { id: { in: tourIds } },
      select: { id: true, name: true },
    });

    const topTours = topToursData.map((t) => ({
      name: tours.find((tw) => tw.id === t.tourId)?.name || "უცნობი",
      activations: t._count.tourId,
    }));

    // პლატფორმების სტატისტიკა
    const platformStats = await prisma.entitlement.findMany({
      where: {
        tour: { museumId },
        ...(dateFilter ? { activatedAt: dateFilter } : {}),
      },
      select: { device: { select: { platform: true } } },
    });

    const platformMap = new Map<string, number>();
    platformStats.forEach((e) => {
      const p = e.device.platform || "unknown";
      platformMap.set(p, (platformMap.get(p) || 0) + 1);
    });

    const byPlatform = Array.from(platformMap.entries()).map(([platform, count]) => ({ platform, count }));

    // აქტივაციები დღეების მიხედვით
    const daysCount = period === "7d" ? 7 : period === "30d" ? 30 : 90;
    const activationsByDateMap = new Map<string, number>();
    for (let i = daysCount - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      activationsByDateMap.set(date.toISOString().split("T")[0], 0);
    }

    const entitlements = await prisma.entitlement.findMany({
      where: {
        tour: { museumId },
        ...(dateFilter ? { activatedAt: dateFilter } : {}),
      },
      select: { activatedAt: true },
    });

    entitlements.forEach((e) => {
      const dateStr = e.activatedAt.toISOString().split("T")[0];
      if (activationsByDateMap.has(dateStr)) {
        activationsByDateMap.set(dateStr, (activationsByDateMap.get(dateStr) || 0) + 1);
      }
    });

    const activationsByDate = Array.from(activationsByDateMap.entries()).map(([date, count]) => ({ date, count }));

    // ბოლო აქტივაციები
    const recentActivations = await prisma.entitlement.findMany({
      where: { tour: { museumId } },
      orderBy: { activatedAt: "desc" },
      take: 20,
      include: {
        tour: { select: { name: true } },
        activationCode: { select: { code: true } },
        device: { select: { platform: true } },
      },
    });

    return NextResponse.json({
      museum: { id: museum.id, name: museum.name },
      codes,
      topTours,
      byPlatform,
      activationsByDate,
      recentActivations: recentActivations.map((e) => ({
        code: e.activationCode?.code || "—",
        tour: e.tour.name,
        platform: e.device.platform || "web",
        date: e.activatedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Museum analytics error:", error);
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}
