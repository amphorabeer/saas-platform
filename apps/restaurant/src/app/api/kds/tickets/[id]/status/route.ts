import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRestaurantSessionFromRequest } from '@/lib/session';

const VALID_STATUSES = ['NEW', 'PREPARING', 'READY', 'SERVED'] as const;

/** PATCH /api/kds/tickets/[id]/status — update ticket status (NEW→PREPARING→READY→SERVED) */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRestaurantSessionFromRequest(req);
    const { id } = await params;
    const body = await req.json();
    const { status } = body;

    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'არასწორი სტატუსი' }, { status: 400 });
    }

    const ticket = await prisma.kitchenTicket.findFirst({
      where: { id, restaurantId: session.restaurantId },
    });
    if (!ticket) {
      return NextResponse.json({ error: 'ტიკეტი ვერ მოიძებნა' }, { status: 404 });
    }

    const current = ticket.status;
    const updates: { status: string; startedAt?: Date; completedAt?: Date } = { status };

    if (status === 'PREPARING' && current === 'NEW') {
      updates.startedAt = new Date();
    } else if (status === 'READY' && current === 'PREPARING') {
      updates.completedAt = new Date();
    } else if (status === 'SERVED' && current !== 'READY') {
      return NextResponse.json(
        { error: 'SERVED მხოლოდ READY სტატუსიდან' },
        { status: 400 }
      );
    } else if (
      (status === 'PREPARING' && current !== 'NEW') ||
      (status === 'READY' && current !== 'PREPARING')
    ) {
      return NextResponse.json(
        { error: 'სტატუსის ცვლილება დაუშვებელია' },
        { status: 400 }
      );
    }

    const updated = await prisma.kitchenTicket.update({
      where: { id },
      data: updates,
      include: {
        order: { select: { orderNumber: true, table: { select: { number: true } } } },
      },
    });

    await prisma.restaurantOrderItem.updateMany({
      where: { orderId: updated.orderId, kdsStation: updated.station },
      data: { status: status as 'NEW' | 'PREPARING' | 'READY' | 'SERVED' },
    });

    return NextResponse.json({
      id: updated.id,
      status: updated.status,
      startedAt: updated.startedAt?.toISOString() ?? null,
      completedAt: updated.completedAt?.toISOString() ?? null,
    });
  } catch (e: unknown) {
    console.error('[KDS ticket status PATCH]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unauthorized' },
      { status: 401 }
    );
  }
}
