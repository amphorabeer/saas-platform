import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRestaurantSessionFromRequest } from '@/lib/session';

const ACTIVE_STATUSES = ['NEW', 'PREPARING', 'READY'] as const;

/** GET /api/kds/tickets — tickets by station (optional), status IN (NEW, PREPARING, READY) */
export async function GET(req: NextRequest) {
  try {
    const session = await requireRestaurantSessionFromRequest(req);
    const { searchParams } = new URL(req.url);
    const station = searchParams.get('station') || undefined;

    const where: { restaurantId: string; status: { in: typeof ACTIVE_STATUSES }; station?: string } = {
      restaurantId: session.restaurantId,
      status: { in: [...ACTIVE_STATUSES] },
    };
    if (station && ['HOT', 'COLD', 'BAR', 'PIZZA', 'GRILL', 'PASTRY'].includes(station)) {
      where.station = station;
    }

    const tickets = await prisma.kitchenTicket.findMany({
      where,
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            orderType: true,
            tableId: true,
            table: { select: { number: true } },
          },
        },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    });

    const serialized = tickets.map((t) => ({
      id: t.id,
      restaurantId: t.restaurantId,
      orderId: t.orderId,
      station: t.station,
      status: t.status,
      items: t.items as unknown[],
      tableNumber: t.tableNumber ?? t.order?.table?.number ?? (t.order?.orderType === 'DINE_IN' ? null : 'Take Away'),
      waiterName: t.waiterName,
      priority: t.priority,
      startedAt: t.startedAt?.toISOString() ?? null,
      completedAt: t.completedAt?.toISOString() ?? null,
      createdAt: t.createdAt.toISOString(),
      orderNumber: t.order?.orderNumber ?? '',
      orderType: t.order?.orderType ?? 'DINE_IN',
    }));
    return NextResponse.json(serialized);
  } catch (e: unknown) {
    console.error('[KDS tickets GET]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unauthorized' },
      { status: 401 }
    );
  }
}
