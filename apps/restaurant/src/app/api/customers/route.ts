import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getRestaurantSessionFromRequest } from '@/lib/session';

type OrderType = 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';

type CustomerRow = {
  customerPhone: string;
  customerName: string | null;
  orderCount: number;
  totalSpent: number;
  avgCheck: number;
  lastOrderAt: Date;
  dineInCount: number;
  takeawayCount: number;
  deliveryCount: number;
};

/** GET /api/customers — aggregated customers from PAID orders (GROUP BY customerPhone) */
export async function GET(req: NextRequest) {
  try {
    const session = await getRestaurantSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.trim() ?? '';
    const orderType = searchParams.get('orderType')?.toUpperCase() as OrderType | null;
    const sort = searchParams.get('sort') ?? 'orderCount';
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
    const offset = (page - 1) * limit;

    const orders = await prisma.restaurantOrder.findMany({
      where: {
        restaurantId: session.restaurantId,
        status: 'PAID',
        customerPhone: { not: null, notIn: [''] },
        ...(orderType && orderType in { DINE_IN: 1, TAKEAWAY: 1, DELIVERY: 1 }
          ? { orderType }
          : {}),
      },
      select: {
        customerPhone: true,
        customerName: true,
        totalAmount: true,
        createdAt: true,
        orderType: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const byPhone = new Map<string, CustomerRow>();

    for (const o of orders) {
      const phone = (o.customerPhone ?? '').trim();
      if (!phone) continue;

      const total = Number(o.totalAmount);
      const existing = byPhone.get(phone);

      if (!existing) {
        byPhone.set(phone, {
          customerPhone: phone,
          customerName: o.customerName ?? null,
          orderCount: 1,
          totalSpent: total,
          avgCheck: total,
          lastOrderAt: o.createdAt,
          dineInCount: o.orderType === 'DINE_IN' ? 1 : 0,
          takeawayCount: o.orderType === 'TAKEAWAY' ? 1 : 0,
          deliveryCount: o.orderType === 'DELIVERY' ? 1 : 0,
        });
      } else {
        existing.orderCount += 1;
        existing.totalSpent += total;
        existing.avgCheck = existing.totalSpent / existing.orderCount;
        if (o.createdAt > existing.lastOrderAt) {
          existing.lastOrderAt = o.createdAt;
          existing.customerName = o.customerName ?? existing.customerName;
        }
        if (o.orderType === 'DINE_IN') existing.dineInCount += 1;
        else if (o.orderType === 'TAKEAWAY') existing.takeawayCount += 1;
        else if (o.orderType === 'DELIVERY') existing.deliveryCount += 1;
      }
    }

    let list = [...byPhone.values()];

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          (c.customerName ?? '').toLowerCase().includes(q) ||
          c.customerPhone.replace(/\D/g, '').includes(q.replace(/\D/g, ''))
      );
    }

    if (sort === 'orderCount') list.sort((a, b) => b.orderCount - a.orderCount);
    else if (sort === 'totalSpent') list.sort((a, b) => b.totalSpent - a.totalSpent);
    else if (sort === 'lastOrder') list.sort((a, b) => b.lastOrderAt.getTime() - a.lastOrderAt.getTime());
    else list.sort((a, b) => b.orderCount - a.orderCount);

    const total = list.length;
    const data = list.slice(offset, offset + limit);

    return NextResponse.json({
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (e) {
    console.error('[api/customers GET]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
