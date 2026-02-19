import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRestaurantSessionFromRequest } from '@/lib/session';

/** GET /api/dashboard/stats — today stats + yesterday for % change */
export async function GET(req: NextRequest) {
  try {
    const session = await requireRestaurantSessionFromRequest(req);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const [todayOrders, yesterdayOrders, todayGuests] = await Promise.all([
      prisma.restaurantOrder.findMany({
        where: {
          restaurantId: session.restaurantId,
          status: 'PAID',
          createdAt: { gte: today, lt: tomorrow },
        },
        select: { totalAmount: true },
      }),
      prisma.restaurantOrder.findMany({
        where: {
          restaurantId: session.restaurantId,
          status: 'PAID',
          createdAt: { gte: yesterday, lt: today },
        },
        select: { totalAmount: true },
      }),
      prisma.tableSession.aggregate({
        where: {
          table: { restaurantId: session.restaurantId },
          startedAt: { gte: today, lt: tomorrow },
        },
        _sum: { guestCount: true },
      }),
    ]);

    const totalSales = todayOrders.reduce((s, o) => s + Number(o.totalAmount), 0);
    const orderCount = todayOrders.length;
    const guestCount = todayGuests._sum.guestCount ?? 0;
    const avgCheck = orderCount > 0 ? totalSales / orderCount : 0;

    const yesterdaySales = yesterdayOrders.reduce((s, o) => s + Number(o.totalAmount), 0);
    const yesterdayOrdersCount = yesterdayOrders.length;
    const salesChangePercent = yesterdaySales > 0 ? ((totalSales - yesterdaySales) / yesterdaySales) * 100 : 0;
    const ordersChangePercent = yesterdayOrdersCount > 0 ? ((orderCount - yesterdayOrdersCount) / yesterdayOrdersCount) * 100 : 0;

    return NextResponse.json({
      totalSales: Math.round(totalSales * 100) / 100,
      orderCount,
      guestCount,
      avgCheck: Math.round(avgCheck * 100) / 100,
      salesChangePercent: Math.round(salesChangePercent * 10) / 10,
      ordersChangePercent: Math.round(ordersChangePercent * 10) / 10,
    });
  } catch (e: unknown) {
    console.error('[dashboard stats GET]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unauthorized' },
      { status: 401 }
    );
  }
}
