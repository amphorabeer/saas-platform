import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRestaurantSessionFromRequest } from '@/lib/session';

/** GET /api/dashboard/charts — last 7 days sales + top 5 items */
export async function GET(req: NextRequest) {
  try {
    const session = await requireRestaurantSessionFromRequest(req);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date(end);
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);

    const orders = await prisma.restaurantOrder.findMany({
      where: {
        restaurantId: session.restaurantId,
        status: 'PAID',
        createdAt: { gte: start, lte: end },
      },
      include: { items: true },
    });

    const dailyMap = new Map<string, number>();
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dailyMap.set(d.toISOString().slice(0, 10), 0);
    }
    for (const o of orders) {
      const day = o.createdAt.toISOString().slice(0, 10);
      dailyMap.set(day, (dailyMap.get(day) ?? 0) + Number(o.totalAmount));
    }

    const last7Days = [...dailyMap.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, totalSales]) => ({ date, totalSales }));

    const itemCounts = new Map<string, { quantity: number; revenue: number }>();
    for (const o of orders) {
      for (const i of o.items) {
        const name = i.menuItemName;
        if (!itemCounts.has(name)) itemCounts.set(name, { quantity: 0, revenue: 0 });
        const row = itemCounts.get(name)!;
        row.quantity += Number(i.quantity);
        row.revenue += Number(i.totalPrice);
      }
    }
    const topItems = [...itemCounts.entries()]
      .map(([name, data]) => ({ name, quantity: data.quantity, revenue: data.revenue }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    return NextResponse.json({
      last7Days,
      topItems,
    });
  } catch (e: unknown) {
    console.error('[dashboard charts GET]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unauthorized' },
      { status: 401 }
    );
  }
}
