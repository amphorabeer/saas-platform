import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRestaurantSessionFromRequest } from '@/lib/session';

/** GET /api/sales/daily — daily summary. Query: date */
export async function GET(req: NextRequest) {
  try {
    const session = await requireRestaurantSessionFromRequest(req);
    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get('date') || new Date().toISOString().slice(0, 10);
    const date = new Date(dateStr);
    date.setHours(0, 0, 0, 0);
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);

    const where = {
      restaurantId: session.restaurantId,
      createdAt: { gte: date, lt: nextDay },
    };

    const orders = await prisma.restaurantOrder.findMany({
      where,
      include: {
        items: true,
        splitPayments: true,
      },
    });

    const paidOrders = orders.filter((o) => o.status === 'PAID');
    const cancelledOrders = orders.filter((o) => o.status === 'CANCELLED');

    const totalSales = paidOrders.reduce((s, o) => s + Number(o.totalAmount), 0);
    const orderCount = paidOrders.length;
    const avgCheck = orderCount > 0 ? totalSales / orderCount : 0;
    const tipsTotal = paidOrders.reduce((s, o) => s + Number(o.tipAmount), 0);
    const discountsTotal = paidOrders.reduce((s, o) => s + Number(o.discountAmount), 0);
    const cancelledCount = cancelledOrders.length;
    const cancelledAmount = cancelledOrders.reduce((s, o) => s + Number(o.totalAmount), 0);

    const guestCount = await prisma.tableSession.aggregate({
      where: {
        table: { restaurantId: session.restaurantId },
        startedAt: { gte: date, lt: nextDay },
      },
      _sum: { guestCount: true },
    });

    const paymentBreakdown: Record<string, { amount: number; count: number }> = {};
    for (const o of paidOrders) {
      if (o.splitPayments.length > 0) {
        for (const sp of o.splitPayments) {
          const method = sp.paymentMethod || 'OTHER';
          if (!paymentBreakdown[method]) paymentBreakdown[method] = { amount: 0, count: 0 };
          paymentBreakdown[method].amount += Number(sp.amount);
          paymentBreakdown[method].count += 1;
        }
      } else {
        const method = (o.paymentMethod || 'CASH') as string;
        if (!paymentBreakdown[method]) paymentBreakdown[method] = { amount: 0, count: 0 };
        paymentBreakdown[method].amount += Number(o.totalAmount);
        paymentBreakdown[method].count += 1;
      }
    }

    const typeBreakdown: Record<string, { amount: number; count: number }> = {};
    for (const o of paidOrders) {
      const t = o.orderType;
      if (!typeBreakdown[t]) typeBreakdown[t] = { amount: 0, count: 0 };
      typeBreakdown[t].amount += Number(o.totalAmount);
      typeBreakdown[t].count += 1;
    }

    const itemCounts = new Map<string, { quantity: number; revenue: number }>();
    for (const o of paidOrders) {
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
      .slice(0, 10);

    return NextResponse.json({
      date: dateStr,
      totalSales,
      orderCount,
      avgCheck,
      guestCount: guestCount._sum.guestCount ?? 0,
      tipsTotal,
      discountsTotal,
      cancelledCount,
      cancelledAmount,
      paymentBreakdown,
      typeBreakdown,
      topItems,
    });
  } catch (e: unknown) {
    console.error('[sales daily GET]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unauthorized' },
      { status: 401 }
    );
  }
}
