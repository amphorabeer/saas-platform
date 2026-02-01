export const dynamic = "force-dynamic";

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

    // Payments statistics
    const paymentsStats = await prisma.payment.groupBy({
      by: ["status"],
      _count: { status: true },
      _sum: { amount: true },
    });

    const payments = {
      total: 0,
      completed: 0,
      pending: 0,
      failed: 0,
      totalRevenue: 0,
    };

    paymentsStats.forEach((stat) => {
      payments.total += stat._count.status;
      const amount = Number(stat._sum.amount || 0);
      switch (stat.status) {
        case "COMPLETED":
          payments.completed = stat._count.status;
          payments.totalRevenue += amount;
          break;
        case "PENDING":
          payments.pending = stat._count.status;
          break;
        case "FAILED":
          payments.failed = stat._count.status;
          break;
      }
    });

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
    const totalStops = await prisma.tourStop.count();

    const museums = {
      total: totalMuseums,
      published: publishedMuseums,
      totalTours,
      publishedTours,
      totalStops,
    };

    // Activations by date (codes + payments)
    const daysCount = period === "7d" ? 7 : period === "30d" ? 30 : period === "90d" ? 90 : 30;
    const activationsByDateMap = new Map<string, { codes: number; payments: number }>();
    
    // Initialize all dates in range
    for (let i = daysCount - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split("T")[0];
      activationsByDateMap.set(dateStr, { codes: 0, payments: 0 });
    }

    // Get code activations
    const entitlements = await prisma.entitlement.findMany({
      where: startDate ? { activatedAt: { gte: startDate } } : {},
      select: { activatedAt: true },
      orderBy: { activatedAt: "asc" },
    });

    entitlements.forEach((e) => {
      const dateStr = e.activatedAt.toISOString().split("T")[0];
      if (activationsByDateMap.has(dateStr)) {
        const current = activationsByDateMap.get(dateStr)!;
        current.codes += 1;
      }
    });

    // Get payment activations
    const completedPayments = await prisma.payment.findMany({
      where: {
        status: "COMPLETED",
        ...(startDate ? { completedAt: { gte: startDate } } : {}),
      },
      select: { completedAt: true },
      orderBy: { completedAt: "asc" },
    });

    completedPayments.forEach((p) => {
      if (p.completedAt) {
        const dateStr = p.completedAt.toISOString().split("T")[0];
        if (activationsByDateMap.has(dateStr)) {
          const current = activationsByDateMap.get(dateStr)!;
          current.payments += 1;
        }
      }
    });

    const activationsByDate = Array.from(activationsByDateMap.entries()).map(
      ([date, counts]) => ({ 
        date, 
        codes: counts.codes,
        payments: counts.payments,
        total: counts.codes + counts.payments 
      })
    );

    // Top Museums by activations (codes + payments)
    const topMuseumsData = await prisma.entitlement.groupBy({
      by: ["tourId"],
      _count: { tourId: true },
      orderBy: { _count: { tourId: "desc" } },
      take: 10,
    });

    const paymentsByTour = await prisma.payment.groupBy({
      by: ["tourId"],
      where: { status: "COMPLETED" },
      _count: { tourId: true },
    });

    const tourIds = [...new Set([
      ...topMuseumsData.map((t) => t.tourId),
      ...paymentsByTour.map((p) => p.tourId),
    ])];

    const toursWithMuseums = await prisma.tour.findMany({
      where: { id: { in: tourIds } },
      include: { museum: { select: { name: true } } },
    });

    // Aggregate by museum
    const museumActivations = new Map<string, { codes: number; payments: number }>();
    
    topMuseumsData.forEach((t) => {
      const tour = toursWithMuseums.find((tw) => tw.id === t.tourId);
      if (tour) {
        const current = museumActivations.get(tour.museum.name) || { codes: 0, payments: 0 };
        current.codes += t._count.tourId;
        museumActivations.set(tour.museum.name, current);
      }
    });

    paymentsByTour.forEach((p) => {
      const tour = toursWithMuseums.find((tw) => tw.id === p.tourId);
      if (tour) {
        const current = museumActivations.get(tour.museum.name) || { codes: 0, payments: 0 };
        current.payments += p._count.tourId;
        museumActivations.set(tour.museum.name, current);
      }
    });

    const topMuseums = Array.from(museumActivations.entries())
      .map(([name, counts]) => ({ 
        name, 
        codes: counts.codes,
        payments: counts.payments,
        total: counts.codes + counts.payments 
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    // Top Tours
    const tourActivations = new Map<string, { codes: number; payments: number }>();
    
    topMuseumsData.forEach((t) => {
      const current = tourActivations.get(t.tourId) || { codes: 0, payments: 0 };
      current.codes = t._count.tourId;
      tourActivations.set(t.tourId, current);
    });

    paymentsByTour.forEach((p) => {
      const current = tourActivations.get(p.tourId) || { codes: 0, payments: 0 };
      current.payments = p._count.tourId;
      tourActivations.set(p.tourId, current);
    });

    const topTours = Array.from(tourActivations.entries())
      .map(([tourId, counts]) => {
        const tour = toursWithMuseums.find((tw) => tw.id === tourId);
        return {
          name: tour?.name || "უცნობი",
          museum: tour?.museum.name || "უცნობი",
          codes: counts.codes,
          payments: counts.payments,
          total: counts.codes + counts.payments,
        };
      })
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    // Recent activations (codes + payments)
    const recentEntitlements = await prisma.entitlement.findMany({
      take: 5,
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

    const recentPayments = await prisma.payment.findMany({
      where: { status: "COMPLETED" },
      take: 5,
      orderBy: { completedAt: "desc" },
      include: {
        tour: {
          select: {
            name: true,
            museum: { select: { name: true } },
          },
        },
      },
    });

    const recentActivations = [
      ...recentEntitlements.map((e) => ({
        type: "code" as const,
        code: e.activationCode?.code || "—",
        museum: e.tour.museum.name,
        tour: e.tour.name,
        platform: e.device.platform || "web",
        date: e.activatedAt.toISOString(),
      })),
      ...recentPayments.map((p) => ({
        type: "payment" as const,
        code: `₾${p.amount}`,
        museum: p.tour.museum.name,
        tour: p.tour.name,
        platform: "TBC Pay",
        date: p.completedAt?.toISOString() || p.createdAt.toISOString(),
      })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
     .slice(0, 10);

    return NextResponse.json({
      codes,
      payments,
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