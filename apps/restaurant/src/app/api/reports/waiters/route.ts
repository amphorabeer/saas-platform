import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRestaurantSessionFromRequest } from '@/lib/session';

/** GET /api/reports/waiters — waiter performance. Query: dateFrom, dateTo */
export async function GET(req: NextRequest) {
  try {
    const session = await requireRestaurantSessionFromRequest(req);
    const { searchParams } = new URL(req.url);
    const dateFrom = searchParams.get('dateFrom') || undefined;
    const dateTo = searchParams.get('dateTo') || undefined;

    const where: { restaurantId: string; status: string; createdAt?: { gte?: Date; lte?: Date } } = {
      restaurantId: session.restaurantId,
      status: 'PAID',
    };
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) {
        const d = new Date(dateTo);
        d.setHours(23, 59, 59, 999);
        where.createdAt.lte = d;
      }
    }

    const orders = await prisma.restaurantOrder.findMany({
      where,
      include: {
        waiter: { select: { id: true, firstName: true, lastName: true } },
        kitchenTickets: { select: { startedAt: true, completedAt: true } },
      },
    });

    const tipsByOrder = await prisma.tip.groupBy({
      by: ['orderId'],
      where: { restaurantId: session.restaurantId, orderId: { in: orders.map((o) => o.id) } },
      _sum: { amount: true },
    });
    const tipsMap = new Map(tipsByOrder.map((t) => [t.orderId, Number(t._sum.amount ?? 0)]));

    const byWaiter = new Map<
      string,
      { name: string; orders: number; sales: number; tips: number; prepTimes: number[] }
    >();

    for (const o of orders) {
      const waiterId = o.waiterId ?? '__no_waiter__';
      const name = o.waiter ? `${o.waiter.firstName} ${o.waiter.lastName}`.trim() : '—';
      if (!byWaiter.has(waiterId)) {
        byWaiter.set(waiterId, { name, orders: 0, sales: 0, tips: 0, prepTimes: [] });
      }
      const row = byWaiter.get(waiterId)!;
      row.orders += 1;
      row.sales += Number(o.totalAmount);
      row.tips += tipsMap.get(o.id) ?? Number(o.tipAmount) ?? 0;

      for (const kt of o.kitchenTickets) {
        if (kt.startedAt && kt.completedAt) {
          const mins = (kt.completedAt.getTime() - kt.startedAt.getTime()) / 60000;
          row.prepTimes.push(mins);
        }
      }
    }

    const list = [...byWaiter.entries()]
      .filter(([id]) => id !== '__no_waiter__')
      .map(([employeeId, row]) => ({
        employeeId,
        name: row.name,
        orders: row.orders,
        sales: Math.round(row.sales * 100) / 100,
        avgCheck: row.orders > 0 ? Math.round((row.sales / row.orders) * 100) / 100 : 0,
        tips: Math.round(row.tips * 100) / 100,
        avgPrepTimeMinutes:
          row.prepTimes.length > 0
            ? Math.round((row.prepTimes.reduce((a, b) => a + b, 0) / row.prepTimes.length) * 10) / 10
            : null,
      }));

    return NextResponse.json(list);
  } catch (e: unknown) {
    console.error('[reports waiters GET]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unauthorized' },
      { status: 401 }
    );
  }
}
