import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRestaurantSessionFromRequest } from '@/lib/session';

const ACTIVE_STATUSES = ['PENDING', 'CONFIRMED', 'SEATED', 'COMPLETED'] as const;
const OVERLAP_EXCLUDE = ['CANCELLED', 'NO_SHOW'];

/** GET /api/reservations — query: date (required), status?, search? */
export async function GET(req: NextRequest) {
  try {
    const session = await requireRestaurantSessionFromRequest(req);
    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get('date');
    const status = searchParams.get('status') || undefined;
    const search = searchParams.get('search')?.trim() || undefined;

    if (!dateStr) {
      return NextResponse.json({ error: 'date აუცილებელია' }, { status: 400 });
    }

    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return NextResponse.json({ error: 'არასწორი თარიღი' }, { status: 400 });
    }

    const where: {
      restaurantId: string;
      date: Date;
      status?: string;
      OR?: { guestName?: { contains: string; mode: 'insensitive' }; guestPhone?: { contains: string; mode: 'insensitive' } }[];
    } = {
      restaurantId: session.restaurantId,
      date,
    };
    if (status && ACTIVE_STATUSES.includes(status as (typeof ACTIVE_STATUSES)[number])) {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { guestName: { contains: search, mode: 'insensitive' } },
        { guestPhone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const list = await prisma.reservation.findMany({
      where,
      include: {
        table: { select: { id: true, number: true, zone: { select: { name: true } } } },
      },
      orderBy: { time: 'asc' },
    });

    const serialized = list.map((r) => ({
      ...r,
      date: r.date.toISOString().slice(0, 10),
      time: r.time instanceof Date ? r.time.toTimeString().slice(0, 5) : String(r.time).slice(0, 5),
      table: r.table
        ? { id: r.table.id, number: r.table.number, zoneName: r.table.zone?.name }
        : null,
    }));

    return NextResponse.json(serialized);
  } catch (e: unknown) {
    console.error('[reservations GET]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unauthorized' },
      { status: 401 }
    );
  }
}

/** POST /api/reservations — create with overlap check */
export async function POST(req: Request) {
  try {
    const session = await requireRestaurantSessionFromRequest(req);
    const body = await req.json();
    const {
      guestName,
      guestPhone,
      guestEmail,
      guestCount,
      date: dateStr,
      time: timeStr,
      duration,
      tableId,
      notes,
    } = body;

    if (!guestName?.trim() || guestCount == null) {
      return NextResponse.json(
        { error: 'სტუმრის სახელი და რაოდენობა აუცილებელია' },
        { status: 400 }
      );
    }

    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return NextResponse.json({ error: 'არასწორი თარიღი' }, { status: 400 });
    }

    const durationMin = [60, 90, 120, 150, 180].includes(Number(duration))
      ? Number(duration)
      : 120;
    const timeNorm = String(timeStr).length === 5 ? timeStr : `${String(timeStr).slice(0, 2)}:${String(timeStr).slice(2, 4)}`;
    const startDate = new Date(`${date.toISOString().slice(0, 10)}T${timeNorm}:00`);
    const endDate = new Date(startDate.getTime() + durationMin * 60 * 1000);

    if (tableId) {
      const overlapping = await prisma.reservation.findMany({
        where: {
          restaurantId: session.restaurantId,
          tableId,
          date,
          status: { notIn: OVERLAP_EXCLUDE },
        },
      });

      for (const ex of overlapping) {
        const exStart = new Date(ex.date);
        const t = ex.time;
        if (t instanceof Date) {
          exStart.setHours(t.getUTCHours(), t.getUTCMinutes(), 0, 0);
        } else {
          const parts = String(t).split(':');
          exStart.setHours(parseInt(parts[0], 10) || 0, parseInt(parts[1], 10) || 0, 0, 0);
        }
        const exEnd = new Date(exStart.getTime() + (ex.duration || 120) * 60 * 1000);
        if (startDate < exEnd && endDate > exStart) {
          return NextResponse.json(
            { error: 'ეს მაგიდა ამ დროს უკვე დარეზერვებულია' },
            { status: 400 }
          );
        }
      }

      const table = await prisma.restaurantTable.findFirst({
        where: { id: tableId, restaurantId: session.restaurantId },
      });
      if (!table) {
        return NextResponse.json({ error: 'მაგიდა ვერ მოიძებნა' }, { status: 404 });
      }
    }

    const timeForDb = new Date(`1970-01-01T${timeNorm}:00`);

    const reservation = await prisma.reservation.create({
      data: {
        restaurantId: session.restaurantId,
        tableId: tableId || null,
        guestName: guestName.trim(),
        guestPhone: guestPhone?.trim() || null,
        guestEmail: guestEmail?.trim() || null,
        guestCount: Math.min(20, Math.max(1, Number(guestCount) || 1)),
        date,
        time: timeForDb,
        duration: durationMin,
        status: 'PENDING',
        notes: notes?.trim() || null,
      },
      include: {
        table: { select: { id: true, number: true, zone: { select: { name: true } } } },
      },
    });

    return NextResponse.json({
      ...reservation,
      date: reservation.date.toISOString().slice(0, 10),
      time:
        reservation.time instanceof Date
          ? reservation.time.toTimeString().slice(0, 5)
          : String(reservation.time).slice(0, 5),
      table: reservation.table
        ? {
            id: reservation.table.id,
            number: reservation.table.number,
            zoneName: reservation.table.zone?.name,
          }
        : null,
    });
  } catch (e: unknown) {
    console.error('[reservations POST]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 }
    );
  }
}
