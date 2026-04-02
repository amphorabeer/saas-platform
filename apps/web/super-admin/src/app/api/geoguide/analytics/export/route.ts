export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "30d";
    const museumId = searchParams.get("museumId") || null;
    const dateFrom = searchParams.get("dateFrom") || null;
    const dateTo = searchParams.get("dateTo") || null;

    let startDate: Date | null = null;
    let endDate: Date | null = null;
    const now = new Date();

    if (dateFrom && dateTo) {
      startDate = new Date(dateFrom);
      endDate = new Date(dateTo);
      endDate.setHours(23, 59, 59, 999);
    } else if (period !== "all") {
      const days = parseInt(period.replace("d", ""));
      startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    }

    const dateFilter = startDate
      ? { gte: startDate, ...(endDate ? { lte: endDate } : {}) }
      : undefined;

    const museums = await prisma.museum.findMany({
      where: museumId ? { id: museumId } : {},
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });

    const rows = [];

    for (const museum of museums) {
      const codesStats = await prisma.activationCode.groupBy({
        by: ["status"],
        where: { museumIds: { has: museum.id } },
        _count: { status: true },
      });

      const codes = { total: 0, available: 0, redeemed: 0, expired: 0, revoked: 0 };
      codesStats.forEach((s) => {
        const count = (s._count as { status: number }).status;
        codes.total += count;
        if (s.status === "AVAILABLE") codes.available = count;
        if (s.status === "REDEEMED") codes.redeemed = count;
        if (s.status === "EXPIRED") codes.expired = count;
        if (s.status === "REVOKED") codes.revoked = count;
      });

      const paymentsData = await prisma.payment.aggregate({
        where: {
          tour: { museumId: museum.id },
          status: "COMPLETED",
          ...(dateFilter ? { completedAt: dateFilter } : {}),
        },
        _count: { id: true },
        _sum: { amount: true },
      });

      rows.push({
        museum: museum.name,
        totalCodes: codes.total,
        redeemed: codes.redeemed,
        available: codes.available,
        expired: codes.expired,
        revoked: codes.revoked,
        redemptionRate: codes.total > 0 ? `${((codes.redeemed / codes.total) * 100).toFixed(1)}%` : "0%",
        payments: paymentsData._count.id,
        revenue: `₾${Number(paymentsData._sum.amount || 0).toFixed(2)}`,
      });
    }

    // დღეების მიხედვით აქტივაციები
    const daysCount =
      dateFrom && dateTo
        ? Math.ceil(
            (new Date(dateTo).getTime() - new Date(dateFrom).getTime()) /
              (1000 * 60 * 60 * 24)
          ) + 1
        : period === "7d"
          ? 7
          : period === "30d"
            ? 30
            : 90;

    const activationsByDateMap = new Map<string, number>();
    for (let i = daysCount - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      activationsByDateMap.set(date.toISOString().split("T")[0], 0);
    }

    const allEntitlements = await prisma.entitlement.findMany({
      where: {
        ...(museumId ? { tour: { museumId } } : {}),
        ...(dateFilter ? { activatedAt: dateFilter } : {}),
      },
      select: { activatedAt: true },
    });

    allEntitlements.forEach((e) => {
      const d = e.activatedAt.toISOString().split("T")[0];
      if (activationsByDateMap.has(d)) {
        activationsByDateMap.set(d, (activationsByDateMap.get(d) || 0) + 1);
      }
    });

    const allPayments = await prisma.payment.findMany({
      where: {
        status: "COMPLETED",
        ...(museumId ? { tour: { museumId } } : {}),
        ...(dateFilter ? { completedAt: dateFilter } : {}),
      },
      select: { completedAt: true, amount: true },
    });

    const paymentsByDate = new Map<string, { count: number; revenue: number }>();
    allPayments.forEach((p) => {
      if (p.completedAt) {
        const d = p.completedAt.toISOString().split("T")[0];
        const curr = paymentsByDate.get(d) || { count: 0, revenue: 0 };
        curr.count += 1;
        curr.revenue += Number(p.amount || 0);
        paymentsByDate.set(d, curr);
      }
    });

    const dailyRows = Array.from(activationsByDateMap.entries()).map(
      ([date, activations]) => {
        const pay = paymentsByDate.get(date) || { count: 0, revenue: 0 };
        return {
          date,
          activations,
          payments: pay.count,
          revenue: `${pay.revenue.toFixed(2)}`,
        };
      }
    );

    return NextResponse.json({
      rows,
      dailyRows,
      generatedAt: now.toISOString(),
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json({ error: "Failed to export" }, { status: 500 });
  }
}
