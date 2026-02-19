import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRestaurantSessionFromRequest } from '@/lib/session';

const OVERLAP_EXCLUDE = ['CANCELLED', 'NO_SHOW'];

/** GET /api/reservations/available-tables — query: date, time, duration, guestCount */
export async function GET(req: NextRequest) {
  try {
    const session = await requireRestaurantSessionFromRequest(req);
    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get('date');
    const timeStr = searchParams.get('time');
    const duration = parseInt(searchParams.get('duration') || '120', 10);
    const guestCount = Math.max(1, parseInt(searchParams.get('guestCount') || '1', 10));

    if (!dateStr || !timeStr) {
      return NextResponse.json(
        { error: 'date და time აუცილებელია' },
        { status: 400 }
      );
    }

    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return NextResponse.json({ error: 'არასწორი თარიღი' }, { status: 400 });
    }

    const timeNorm = String(timeStr).length === 5 ? timeStr : `${String(timeStr).slice(0, 2)}:${String(timeStr).slice(2, 4)}`;
    const startDate = new Date(`${date.toISOString().slice(0, 10)}T${timeNorm}:00`);
    const endDate = new Date(startDate.getTime() + duration * 60 * 1000);

    const [allTables, overlappingReservations] = await Promise.all([
      prisma.restaurantTable.findMany({
        where: { restaurantId: session.restaurantId, isActive: true, seats: { gte: guestCount } },
        include: { zone: { select: { id: true, name: true } } },
        orderBy: [{ zone: { sortOrder: 'asc' } }, { number: 'asc' }],
      }),
      prisma.reservation.findMany({
        where: {
          restaurantId: session.restaurantId,
          date,
          tableId: { not: null },
          status: { notIn: OVERLAP_EXCLUDE },
        },
      }),
    ]);

    const busyTableIds = new Set<string>();
    for (const r of overlappingReservations) {
      if (!r.tableId) continue;
      const exStart = new Date(r.date);
      const t = r.time;
      if (t instanceof Date) {
        exStart.setHours(t.getUTCHours(), t.getUTCMinutes(), 0, 0);
      } else {
        const parts = String(t).split(':');
        exStart.setHours(parseInt(parts[0], 10) || 0, parseInt(parts[1], 10) || 0, 0, 0);
      }
      const exEnd = new Date(exStart.getTime() + (r.duration || 120) * 60 * 1000);
      if (startDate < exEnd && endDate > exStart) {
        busyTableIds.add(r.tableId);
      }
    }

    const available = allTables
      .filter((t) => !busyTableIds.has(t.id))
      .map((t) => ({
        id: t.id,
        number: t.number,
        seats: t.seats,
        zoneName: t.zone?.name,
      }));

    return NextResponse.json(available);
  } catch (e: unknown) {
    console.error('[reservations available-tables]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unauthorized' },
      { status: 401 }
    );
  }
}
