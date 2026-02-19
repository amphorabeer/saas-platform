import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRestaurantSessionFromRequest } from '@/lib/session';

/** PATCH /api/reservations/[id]/status — body: { status } + side effects */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRestaurantSessionFromRequest(req);
    const { id } = await params;
    const body = await req.json();
    const newStatus = body.status;

    const valid = ['PENDING', 'CONFIRMED', 'SEATED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'];
    if (!valid.includes(newStatus)) {
      return NextResponse.json({ error: 'არასწორი სტატუსი' }, { status: 400 });
    }

    const reservation = await prisma.reservation.findFirst({
      where: { id, restaurantId: session.restaurantId },
      include: { table: true },
    });
    if (!reservation) {
      return NextResponse.json({ error: 'რეზერვაცია ვერ მოიძებნა' }, { status: 404 });
    }

    const prev = reservation.status;

    if (newStatus === 'CONFIRMED') {
      const updates: Promise<unknown>[] = [
        prisma.reservation.update({
          where: { id },
          data: { status: 'CONFIRMED', smsSent: true },
        }),
      ];
      // Set table to RESERVED if it's currently FREE
      if (reservation.tableId && reservation.table?.status === 'FREE') {
        updates.push(
          prisma.restaurantTable.update({
            where: { id: reservation.tableId },
            data: { status: 'RESERVED' },
          })
        );
      }
      await Promise.all(updates);
      if (reservation.guestPhone) {
        console.log('SMS would be sent to: ' + reservation.guestPhone);
      }
      return NextResponse.json({ ok: true, status: 'CONFIRMED' });
    }

    if (newStatus === 'SEATED') {
      if (!reservation.tableId) {
        return NextResponse.json(
          { error: 'მაგიდა არ არის მინიჭებული' },
          { status: 400 }
        );
      }
      await prisma.$transaction([
        prisma.reservation.update({
          where: { id },
          data: { status: 'SEATED' },
        }),
        prisma.restaurantTable.update({
          where: { id: reservation.tableId },
          data: { status: 'OCCUPIED' },
        }),
        prisma.tableSession.create({
          data: {
            tableId: reservation.tableId,
            guestCount: reservation.guestCount,
            isActive: true,
          },
        }),
      ]);
      return NextResponse.json({ ok: true, status: 'SEATED' });
    }

    if (newStatus === 'COMPLETED') {
      if (reservation.tableId) {
        const activeSession = await prisma.tableSession.findFirst({
          where: { tableId: reservation.tableId, isActive: true },
        });
        if (activeSession) {
          await prisma.tableSession.update({
            where: { id: activeSession.id },
            data: { endedAt: new Date(), isActive: false },
          });
        }
        await prisma.restaurantTable.update({
          where: { id: reservation.tableId },
          data: { status: 'FREE' },
        });
      }
      await prisma.reservation.update({
        where: { id },
        data: { status: 'COMPLETED' },
      });
      return NextResponse.json({ ok: true, status: 'COMPLETED' });
    }

    if (newStatus === 'CANCELLED' || newStatus === 'NO_SHOW') {
      if (reservation.tableId && (prev === 'CONFIRMED' || prev === 'SEATED')) {
        if (prev === 'SEATED') {
          const activeSession = await prisma.tableSession.findFirst({
            where: { tableId: reservation.tableId, isActive: true },
          });
          if (activeSession) {
            await prisma.tableSession.update({
              where: { id: activeSession.id },
              data: { endedAt: new Date(), isActive: false },
            });
          }
        }
        await prisma.restaurantTable.update({
          where: { id: reservation.tableId },
          data: { status: 'FREE' },
        });
      }
      await prisma.reservation.update({
        where: { id },
        data: { status: newStatus },
      });
      return NextResponse.json({ ok: true, status: newStatus });
    }

    await prisma.reservation.update({
      where: { id },
      data: { status: newStatus },
    });
    return NextResponse.json({ ok: true, status: newStatus });
  } catch (e: unknown) {
    console.error('[reservations status PATCH]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 }
    );
  }
}