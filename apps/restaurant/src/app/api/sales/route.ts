import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRestaurantSessionFromRequest } from '@/lib/session';

/** GET /api/sales — orders history, filters: dateFrom, dateTo, status, orderType, waiterId, search, page, limit */
export async function GET(req: NextRequest) {
  try {
    const session = await requireRestaurantSessionFromRequest(req);
    const { searchParams } = new URL(req.url);
    const dateFrom = searchParams.get('dateFrom') || undefined;
    const dateTo = searchParams.get('dateTo') || undefined;
    const status = searchParams.get('status') || undefined;
    const orderType = searchParams.get('orderType') || undefined;
    const waiterId = searchParams.get('waiterId') || undefined;
    const search = searchParams.get('search')?.trim() || undefined;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(10, parseInt(searchParams.get('limit') || '20', 10)));
    const sort = searchParams.get('sort') || 'date';
    const order = searchParams.get('order') === 'asc' ? 'asc' : 'desc';

    const where: {
      restaurantId: string;
      createdAt?: { gte?: Date; lte?: Date };
      status?: string;
      orderType?: string;
      waiterId?: string;
      orderNumber?: { contains: string; mode: 'insensitive' };
    } = { restaurantId: session.restaurantId };

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) {
        const d = new Date(dateTo);
        d.setHours(23, 59, 59, 999);
        where.createdAt.lte = d;
      }
    }
    if (status && ['PAID', 'CANCELLED', 'DRAFT', 'CONFIRMED', 'SERVED'].includes(status)) {
      where.status = status;
    }
    if (orderType && ['DINE_IN', 'TAKEAWAY', 'DELIVERY'].includes(orderType)) {
      where.orderType = orderType;
    }
    if (waiterId) where.waiterId = waiterId;
    if (search) where.orderNumber = { contains: search, mode: 'insensitive' };

    const orderBy = sort === 'totalAmount' ? { totalAmount: order } : { createdAt: order };

    const [orders, total] = await Promise.all([
      prisma.restaurantOrder.findMany({
        where,
        include: {
          items: true,
          table: { select: { id: true, number: true, zone: { select: { name: true } } } },
          waiter: { select: { id: true, firstName: true, lastName: true } },
          splitPayments: true,
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.restaurantOrder.count({ where }),
    ]);

    const serialized = orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      createdAt: o.createdAt.toISOString(),
      orderType: o.orderType,
      status: o.status,
      table: o.table ? { id: o.table.id, number: o.table.number, zoneName: o.table.zone?.name } : null,
      waiter: o.waiter
        ? { id: o.waiter.id, name: `${o.waiter.firstName} ${o.waiter.lastName}`.trim() }
        : null,
      itemsCount: o.items.length,
      subtotal: Number(o.subtotal),
      taxAmount: Number(o.taxAmount),
      discountAmount: Number(o.discountAmount),
      tipAmount: Number(o.tipAmount),
      totalAmount: Number(o.totalAmount),
      paymentMethod: o.paymentMethod,
      paidAmount: Number(o.paidAmount),
      items: o.items.map((i) => ({
        id: i.id,
        menuItemName: i.menuItemName,
        quantity: Number(i.quantity),
        unitPrice: Number(i.unitPrice),
        totalPrice: Number(i.totalPrice),
        modifiers: i.modifiers,
      })),
      splitPayments: o.splitPayments.map((s) => ({
        id: s.id,
        amount: Number(s.amount),
        paymentMethod: s.paymentMethod,
      })),
    }));

    return NextResponse.json({
      items: serialized,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (e: unknown) {
    console.error('[sales GET]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unauthorized' },
      { status: 401 }
    );
  }
}
