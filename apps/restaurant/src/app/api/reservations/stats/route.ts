import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRestaurantSessionFromRequest } from '@/lib/session';

/** GET /api/reservations/stats — today: count, guests, next upcoming */
export async function GET(req: NextRequest) {
  try {
    const session = await requireRestaurantSessionFromRequest(req);
    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get('date');

    const today = dateStr ? new Date(dateStr) : new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [reservations, tablesCount] = await Promise.all([
      prisma.reservation.findMany({
        where: {
          restaurantId: session.restaurantId,
          date: { gte: today, lt: tomorrow },
          status: { in: ['PENDING', 'CONFIRMED', 'SEATED', 'COMPLETED'] },
        },
        include: {
          table: { select: { id: true } },
        },
        orderBy: { time: 'asc' },
      }),
      prisma.restaurantTable.count({
        where: { restaurantId: session.restaurantId, isActive: true },
      }),
    ]);

    const pendingOrConfirmed = reservations.filter(
      (r) => r.status === 'PENDING' || r.status === 'CONFIRMED'
    );
    const totalGuests = reservations.reduce((s, r) => s + r.guestCount, 0);
    const assignedTableIds = new Set(
      reservations.filter((r) => r.tableId && !['CANCELLED', 'NO_SHOW'].includes(r.status)).map((r) => r.tableId)
    );
    const freeTables = tablesCount - assignedTableIds.size;

    const upcoming = [...pendingOrConfirmed]
      .sort((a, b) => {
        const ta = a.time instanceof Date ? a.time.getTime() : 0;
        const tb = b.time instanceof Date ? b.time.getTime() : 0;
        return ta - tb;
      })
      .filter((r) => {
        const now = new Date();
        const t = r.time;
        let h = 0,
          m = 0;
        if (t instanceof Date) {
          h = t.getUTCHours();
          m = t.getUTCMinutes();
        } else {
          const parts = String(t).split(':');
          h = parseInt(parts[0], 10) || 0;
          m = parseInt(parts[1], 10) || 0;
        }
        const resTime = new Date(today);
        resTime.setHours(h, m, 0, 0);
        return resTime >= now;
      })[0];

    return NextResponse.json({
      totalReservations: pendingOrConfirmed.length,
      totalGuests,
      freeTables: Math.max(0, freeTables),
      nextUpcoming: upcoming
        ? {
            id: upcoming.id,
            guestName: upcoming.guestName,
            time: upcoming.time instanceof Date ? upcoming.time.toTimeString().slice(0, 5) : String(upcoming.time).slice(0, 5),
            guestCount: upcoming.guestCount,
          }
        : null,
    });
  } catch (e: unknown) {
    console.error('[reservations stats]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unauthorized' },
      { status: 401 }
    );
  }
}
