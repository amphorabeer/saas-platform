import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getRestaurantSessionFromRequest } from '@/lib/session';

/** GET /api/customers/[phone] — customer detail: orders list + top items */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ phone: string }> }
) {
  try {
    const session = await getRestaurantSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { phone: encodedPhone } = await params;
    const customerPhone = decodeURIComponent(encodedPhone);
    if (!customerPhone.trim()) {
      return NextResponse.json({ error: 'Invalid phone' }, { status: 400 });
    }

    const orders = await prisma.restaurantOrder.findMany({
      where: {
        restaurantId: session.restaurantId,
        status: 'PAID',
        customerPhone: customerPhone.trim(),
      },
      include: {
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (orders.length === 0) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const lastOrder = orders[0];
    const customerName = lastOrder.customerName ?? null;
    const totalSpent = orders.reduce((s, o) => s + Number(o.totalAmount), 0);
    const avgCheck = orders.length ? totalSpent / orders.length : 0;

    const itemCounts = new Map<string, { count: number; total: number }>();
    for (const order of orders) {
      for (const item of order.items) {
        const name = item.menuItemName;
        if (!itemCounts.has(name)) itemCounts.set(name, { count: 0, total: 0 });
        const r = itemCounts.get(name)!;
        r.count += Number(item.quantity);
        r.total += Number(item.totalPrice);
      }
    }
    const topItems = [...itemCounts.entries()]
      .map(([name, data]) => ({ name, count: data.count, total: data.total }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const orderList = orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      orderType: o.orderType,
      status: o.status,
      totalAmount: Number(o.totalAmount),
      createdAt: o.createdAt,
      itemCount: o.items.length,
      itemsSummary: o.items.map((i) => i.menuItemName).join(', '),
    }));

    return NextResponse.json({
      customerPhone: customerPhone.trim(),
      customerName,
      orderCount: orders.length,
      totalSpent: Math.round(totalSpent * 100) / 100,
      avgCheck: Math.round(avgCheck * 100) / 100,
      lastOrderAt: lastOrder.createdAt,
      orders: orderList,
      topItems,
    });
  } catch (e) {
    console.error('[api/customers/[phone] GET]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
