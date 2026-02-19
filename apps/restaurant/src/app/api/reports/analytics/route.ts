import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRestaurantSessionFromRequest } from '@/lib/session';

/** GET /api/reports/analytics — sales analytics. Query: dateFrom, dateTo */
export async function GET(req: NextRequest) {
  try {
    const session = await requireRestaurantSessionFromRequest(req);
    const { searchParams } = new URL(req.url);
    const dateFrom = searchParams.get('dateFrom') || undefined;
    const dateTo = searchParams.get('dateTo') || undefined;

    if (!dateFrom || !dateTo) {
      return NextResponse.json({ error: 'dateFrom და dateTo აუცილებელია' }, { status: 400 });
    }

    const start = new Date(dateFrom);
    start.setHours(0, 0, 0, 0);
    const end = new Date(dateTo);
    end.setHours(23, 59, 59, 999);

    const orders = await prisma.restaurantOrder.findMany({
      where: {
        restaurantId: session.restaurantId,
        status: 'PAID',
        createdAt: { gte: start, lte: end },
      },
      include: {
        items: { include: { menuItem: { select: { categoryId: true } } } },
      },
    });

    const dailyMap = new Map<string, { total: number; count: number }>();
    const categoryMap = new Map<string, { total: number; count: number }>();
    const orderTypeMap = new Map<string, { total: number; count: number }>();
    const hourlyMap = new Map<number, { total: number; count: number }>();
    const itemCounts = new Map<string, number>();

    for (const o of orders) {
      const day = o.createdAt.toISOString().slice(0, 10);
      if (!dailyMap.has(day)) dailyMap.set(day, { total: 0, count: 0 });
      const d = dailyMap.get(day)!;
      d.total += Number(o.totalAmount);
      d.count += 1;

      const oType = o.orderType;
      if (!orderTypeMap.has(oType)) orderTypeMap.set(oType, { total: 0, count: 0 });
      const ot = orderTypeMap.get(oType)!;
      ot.total += Number(o.totalAmount);
      ot.count += 1;

      const hour = o.createdAt.getHours();
      if (!hourlyMap.has(hour)) hourlyMap.set(hour, { total: 0, count: 0 });
      const h = hourlyMap.get(hour)!;
      h.total += Number(o.totalAmount);
      h.count += 1;

      for (const i of o.items) {
        const name = i.menuItemName;
        itemCounts.set(name, (itemCounts.get(name) ?? 0) + Number(i.quantity));
        const catId = i.menuItem?.categoryId ?? 'OTHER';
        if (!categoryMap.has(catId)) categoryMap.set(catId, { total: 0, count: 0 });
        const c = categoryMap.get(catId)!;
        c.total += Number(i.totalPrice);
        c.count += 1;
      }
    }

    const dailySales = [...dailyMap.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, data]) => ({ date, totalSales: data.total, orderCount: data.count }));

    const categoryIds = [...categoryMap.keys()];
    const categories = await prisma.menuCategory.findMany({
      where: { id: { in: categoryIds }, restaurantId: session.restaurantId },
      select: { id: true, name: true },
    });
    const catNameById = new Map(categories.map((c) => [c.id, c.name]));
    const categoryBreakdown = [...categoryMap.entries()].map(([id, data]) => ({
      categoryId: id,
      categoryName: catNameById.get(id) ?? id,
      total: data.total,
      orderCount: data.count,
    }));

    const hourlyBreakdown = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      total: hourlyMap.get(hour)?.total ?? 0,
      orderCount: hourlyMap.get(hour)?.count ?? 0,
    }));

    const totalRevenue = orders.reduce((s, o) => s + Number(o.totalAmount), 0);
    const daysCount = dailySales.length || 1;
    const avgDailySales = totalRevenue / daysCount;
    const totalOrders = orders.length;
    const avgOrdersPerDay = totalOrders / daysCount;

    const peakHourEntry = [...hourlyMap.entries()].sort((a, b) => b[1].total - a[1].total)[0];
    const peakHour = peakHourEntry ? peakHourEntry[0] : 0;

    const topItemEntry = [...itemCounts.entries()].sort((a, b) => b[1] - a[1])[0];
    const topItem = topItemEntry ? topItemEntry[0] : null;

    const orderTypeBreakdown = [...orderTypeMap.entries()].map(([orderType, data]) => ({
      orderType,
      total: data.total,
      count: data.count,
    }));

    return NextResponse.json({
      dailySales,
      categoryBreakdown,
      orderTypeBreakdown,
      hourlyBreakdown,
      kpis: {
        avgDailySales: Math.round(avgDailySales * 100) / 100,
        avgOrdersPerDay: Math.round(avgOrdersPerDay * 10) / 10,
        peakHour,
        topItem,
      },
    });
  } catch (e: unknown) {
    console.error('[analytics GET]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unauthorized' },
      { status: 401 }
    );
  }
}
