import { NextRequest, NextResponse } from 'next/server';
import { Decimal } from '@prisma/client/runtime/library';
import { prisma } from '@/lib/prisma';
import { requireRestaurantSessionFromRequest } from '@/lib/session';

/** PUT /api/pos/orders/[id]/discount — apply discount */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRestaurantSessionFromRequest(req);
    const { id } = await params;
    const body = await req.json();
    const { discountAmount, discountType } = body;

    const order = await prisma.restaurantOrder.findFirst({
      where: { id, restaurantId: session.restaurantId },
    });
    if (!order) {
      return NextResponse.json({ error: 'შეკვეთა ვერ მოიძებნა' }, { status: 404 });
    }
    if (order.status === 'PAID' || order.status === 'CANCELLED') {
      return NextResponse.json(
        { error: 'შეკვეთის ფასდაკლების შეცვლა შეუძლებელია' },
        { status: 400 }
      );
    }

    const subtotal = Number(order.subtotal);
    let discountNum = Number(discountAmount) || 0;
    if (discountType === 'percent') {
      discountNum = (subtotal * discountNum) / 100;
    }
    discountNum = Math.max(0, Math.min(discountNum, subtotal));
    const taxAmount = Number(order.taxAmount);
    const totalAmount = Math.max(0, subtotal - discountNum + taxAmount);

    const updated = await prisma.restaurantOrder.update({
      where: { id },
      data: {
        discountAmount: new Decimal(discountNum),
        totalAmount: new Decimal(totalAmount),
      },
      include: {
        items: true,
        table: { select: { id: true, number: true, zone: { select: { name: true } } } },
        waiter: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    const serialized = {
      ...updated,
      subtotal: Number(updated.subtotal),
      taxAmount: Number(updated.taxAmount),
      discountAmount: Number(updated.discountAmount),
      tipAmount: Number(updated.tipAmount),
      totalAmount: Number(updated.totalAmount),
      paidAmount: Number(updated.paidAmount),
      changeAmount: Number(updated.changeAmount),
      items: updated.items.map((i) => ({
        ...i,
        quantity: Number(i.quantity),
        unitPrice: Number(i.unitPrice),
        totalPrice: Number(i.totalPrice),
      })),
    };
    return NextResponse.json(serialized);
  } catch (e: unknown) {
    console.error('[POS order discount]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 }
    );
  }
}
