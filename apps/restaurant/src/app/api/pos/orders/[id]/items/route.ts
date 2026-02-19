import { NextRequest, NextResponse } from 'next/server';
import { Decimal } from '@prisma/client/runtime/library';
import { prisma } from '@/lib/prisma';
import { requireRestaurantSessionFromRequest } from '@/lib/session';

/** POST /api/pos/orders/[id]/items — add items to existing order + new kitchen tickets */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRestaurantSessionFromRequest(req);
    const { id: orderId } = await params;
    const body = await req.json();
    const { items: itemsPayload } = body;

    if (!itemsPayload || !Array.isArray(itemsPayload) || itemsPayload.length === 0) {
      return NextResponse.json(
        { error: 'მინიმუმ ერთი პოზიცია აუცილებელია' },
        { status: 400 }
      );
    }

    const order = await prisma.restaurantOrder.findFirst({
      where: { id: orderId, restaurantId: session.restaurantId },
      include: {
        table: { select: { number: true } },
        waiter: { select: { firstName: true, lastName: true } },
      },
    });
    if (!order) {
      return NextResponse.json({ error: 'შეკვეთა ვერ მოიძებნა' }, { status: 404 });
    }
    if (order.status === 'PAID' || order.status === 'CANCELLED') {
      return NextResponse.json(
        { error: 'შეკვეთაზე პოზიციების დამატება შეუძლებელია' },
        { status: 400 }
      );
    }

    type Station = 'HOT' | 'COLD' | 'BAR' | 'PIZZA' | 'GRILL' | 'PASTRY';
    const kdsStationMap = new Map<
      Station,
      { menuItemName: string; quantity: number; unitPrice: number; totalPrice: number; modifiers: unknown; specialInstructions: string | null }[]
    >();

    let addedSubtotal = 0;
    for (const it of itemsPayload) {
      const qty = Number(it.quantity) || 1;
      const unitPrice = Number(it.unitPrice) || 0;
      const totalPrice = Number(it.totalPrice) || unitPrice * qty;
      addedSubtotal += totalPrice;
      const station = (it.kdsStation || 'HOT') as Station;

      await prisma.restaurantOrderItem.create({
        data: {
          orderId,
          menuItemId: it.menuItemId,
          menuItemName: it.menuItemName || 'Item',
          quantity: new Decimal(qty),
          unitPrice: new Decimal(unitPrice),
          totalPrice: new Decimal(totalPrice),
          modifiers: (it.modifiers ?? undefined) as object | undefined,
          specialInstructions: it.specialInstructions?.trim() || null,
          kdsStation: station,
        },
      });

      const list = kdsStationMap.get(station) || [];
      list.push({
        menuItemName: it.menuItemName || 'Item',
        quantity: qty,
        unitPrice,
        totalPrice,
        modifiers: it.modifiers || null,
        specialInstructions: it.specialInstructions?.trim() || null,
      });
      kdsStationMap.set(station, list);
    }

    const currentSubtotal = Number(order.subtotal) + addedSubtotal;
    const discountAmount = Number(order.discountAmount);
    const taxAmount = Number(order.taxAmount);
    const newTotal = Math.max(0, currentSubtotal - discountAmount + taxAmount);

    await prisma.restaurantOrder.update({
      where: { id: orderId },
      data: {
        subtotal: new Decimal(currentSubtotal),
        totalAmount: new Decimal(newTotal),
      },
    });

    const tableNumber = order.table?.number ?? null;
    const waiterName = order.waiter
      ? `${order.waiter.firstName} ${order.waiter.lastName}`.trim()
      : null;

    for (const [station, items] of kdsStationMap) {
      await prisma.kitchenTicket.create({
        data: {
          restaurantId: session.restaurantId,
          orderId,
          station,
          status: 'NEW',
          items: items as unknown as object,
          tableNumber,
          waiterName,
          priority: 0,
        },
      });
    }

    const updated = await prisma.restaurantOrder.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        table: { select: { id: true, number: true, zone: { select: { name: true } } } },
        waiter: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    const serialized = {
      ...updated,
      subtotal: Number(updated!.subtotal),
      taxAmount: Number(updated!.taxAmount),
      discountAmount: Number(updated!.discountAmount),
      tipAmount: Number(updated!.tipAmount),
      totalAmount: Number(updated!.totalAmount),
      paidAmount: Number(updated!.paidAmount),
      changeAmount: Number(updated!.changeAmount),
      items: updated!.items.map((i) => ({
        ...i,
        quantity: Number(i.quantity),
        unitPrice: Number(i.unitPrice),
        totalPrice: Number(i.totalPrice),
      })),
    };
    return NextResponse.json(serialized);
  } catch (e: unknown) {
    console.error('[POS order items POST]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 }
    );
  }
}
