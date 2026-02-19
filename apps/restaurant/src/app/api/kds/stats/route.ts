import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRestaurantSessionFromRequest } from '@/lib/session';

/** GET /api/kds/stats — counts by status, avg prep time (last 1h) */
export async function GET(req: NextRequest) {
  try {
    const session = await requireRestaurantSessionFromRequest(req);

    const [newCount, preparingCount, readyCount] = await Promise.all([
      prisma.kitchenTicket.count({
        where: { restaurantId: session.restaurantId, status: 'NEW' },
      }),
      prisma.kitchenTicket.count({
        where: { restaurantId: session.restaurantId, status: 'PREPARING' },
      }),
      prisma.kitchenTicket.count({
        where: { restaurantId: session.restaurantId, status: 'READY' },
      }),
    ]);

    const lastHour = new Date(Date.now() - 60 * 60 * 1000);
    const completedTickets = await prisma.kitchenTicket.findMany({
      where: {
        restaurantId: session.restaurantId,
        status: 'SERVED',
        startedAt: { not: null },
        completedAt: { not: null, gte: lastHour },
      },
      select: { startedAt: true, completedAt: true },
    });
    let avgPrepSeconds = 0;
    if (completedTickets.length > 0) {
      const totalSec =
        completedTickets.reduce((sum, t) => {
          if (t.startedAt && t.completedAt) {
            return sum + (t.completedAt.getTime() - t.startedAt.getTime()) / 1000;
          }
          return sum;
        }, 0);
      avgPrepSeconds = Math.round(totalSec / completedTickets.length);
    }

    return NextResponse.json({
      new: newCount,
      preparing: preparingCount,
      ready: readyCount,
      avgPrepSeconds,
    });
  } catch (e: unknown) {
    console.error('[KDS stats GET]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unauthorized' },
      { status: 401 }
    );
  }
}
