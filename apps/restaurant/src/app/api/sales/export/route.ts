import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRestaurantSessionFromRequest } from '@/lib/session';

/** GET /api/sales/export — CSV export. Query: dateFrom, dateTo (same as sales list) */
export async function GET(req: NextRequest) {
  try {
    const session = await requireRestaurantSessionFromRequest(req);
    const { searchParams } = new URL(req.url);
    const dateFrom = searchParams.get('dateFrom') || undefined;
    const dateTo = searchParams.get('dateTo') || undefined;
    const status = searchParams.get('status') || undefined;

    const where: {
      restaurantId: string;
      createdAt?: { gte?: Date; lte?: Date };
      status?: string;
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
    if (status) where.status = status;

    const orders = await prisma.restaurantOrder.findMany({
      where,
      include: {
        table: { select: { number: true } },
        waiter: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 5000,
    });

    const headers = [
      'orderNumber',
      'createdAt',
      'orderType',
      'status',
      'tableNumber',
      'waiterName',
      'subtotal',
      'discountAmount',
      'tipAmount',
      'totalAmount',
      'paymentMethod',
    ];
    const escape = (v: string | number) => {
      const s = String(v);
      if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    const rows = orders.map((o) =>
      [
        o.orderNumber,
        o.createdAt.toISOString(),
        o.orderType,
        o.status,
        o.table?.number ?? '',
        o.waiter ? `${o.waiter.firstName} ${o.waiter.lastName}`.trim() : '',
        Number(o.subtotal),
        Number(o.discountAmount),
        Number(o.tipAmount),
        Number(o.totalAmount),
        o.paymentMethod ?? '',
      ].map(escape).join(',')
    );
    const csv = ['\uFEFF' + headers.join(','), ...rows].join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="sales-${dateFrom || 'start'}-${dateTo || 'end'}.csv"`,
      },
    });
  } catch (e: unknown) {
    console.error('[sales export GET]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unauthorized' },
      { status: 401 }
    );
  }
}
