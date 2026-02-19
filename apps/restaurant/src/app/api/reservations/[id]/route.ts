import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRestaurantSessionFromRequest } from '@/lib/session';

const OVERLAP_EXCLUDE = ['CANCELLED', 'NO_SHOW'];

/** GET /api/reservations/[id] */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRestaurantSessionFromRequest(req);
    const { id } = await params;

    const r = await prisma.reservation.findFirst({
      where: { id, restaurantId: session.restaurantId },
      include: {
        table: { select: { id: true, number: true, seats: true, zone: { select: { name: true } } } },
      },
    });
    if (!r) {
      return NextResponse.json({ error: 'რეზერვაცია ვერ მოიძებნა' }, { status: 404 });
    }

    return NextResponse.json({
      ...r,
      date: r.date.toISOString().slice(0, 10),
      time: r.time instanceof Date ? r.time.toTimeString().slice(0, 5) : String(r.time).slice(0, 5),
      table: r.table
        ? { id: r.table.id, number: r.table.number, seats: r.table.seats, zoneName: r.table.zone?.name }
        : null,
    });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unauthorized' },
      { status: 401 }
    );
  }
}

/** PUT /api/reservations/[id] — update, overlap check if table/time changed */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRestaurantSessionFromRequest(req);
    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.reservation.findFirst({
      where: { id, restaurantId: session.restaurantId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'რეზერვაცია ვერ მოიძებნა' }, { status: 404 });
    }

    const dateStr = body.date ?? existing.date;
    const date = new Date(dateStr);
    const timeStr = body.time ?? (existing.time instanceof Date ? existing.time.toTimeString().slice(0, 5) : String(existing.time).slice(0, 5));
    const durationMin = body.duration != null ? (([60, 90, 120, 150, 180].includes(Number(body.duration)) ? Number(body.duration) : existing.duration || 120)) : (existing.duration || 120);
    const timeNorm = String(timeStr).length === 5 ? timeStr : `${String(timeStr).slice(0, 2)}:${String(timeStr).slice(2, 4)}`;
    const tableId = body.tableId !== undefined ? (body.tableId || null) : existing.tableId;

    if (tableId) {
      const startDate = new Date(`${date.toISOString().slice(0, 10)}T${timeNorm}:00`);
      const endDate = new Date(startDate.getTime() + durationMin * 60 * 1000);

      const overlapping = await prisma.reservation.findMany({
        where: {
          restaurantId: session.restaurantId,
          tableId,
          date,
          id: { not: id },
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
    }

    const timeForDb = new Date(`1970-01-01T${timeNorm}:00`);

    const updates: Record<string, unknown> = {};
    if (body.guestName !== undefined) updates.guestName = String(body.guestName).trim();
    if (body.guestPhone !== undefined) updates.guestPhone = body.guestPhone?.trim() || null;
    if (body.guestEmail !== undefined) updates.guestEmail = body.guestEmail?.trim() || null;
    if (body.guestCount !== undefined) updates.guestCount = Math.min(20, Math.max(1, Number(body.guestCount)));
    if (body.date !== undefined) updates.date = date;
    if (body.time !== undefined) updates.time = timeForDb;
    if (body.duration !== undefined) updates.duration = durationMin;
    if (body.tableId !== undefined) updates.tableId = tableId;
    if (body.notes !== undefined) updates.notes = body.notes?.trim() || null;

    const updated = await prisma.reservation.update({
      where: { id },
      data: updates,
      include: {
        table: { select: { id: true, number: true, zone: { select: { name: true } } } },
      },
    });

    return NextResponse.json({
      ...updated,
      date: updated.date.toISOString().slice(0, 10),
      time: updated.time instanceof Date ? updated.time.toTimeString().slice(0, 5) : String(updated.time).slice(0, 5),
      table: updated.table
        ? { id: updated.table.id, number: updated.table.number, zoneName: updated.table.zone?.name }
        : null,
    });
  } catch (e: unknown) {
    console.error('[reservations PUT]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 }
    );
  }
}

/** DELETE /api/reservations/[id] */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRestaurantSessionFromRequest(req);
    const { id } = await params;

    const existing = await prisma.reservation.findFirst({
      where: { id, restaurantId: session.restaurantId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'რეზერვაცია ვერ მოიძებნა' }, { status: 404 });
    }

    await prisma.reservation.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 }
    );
  }
}
