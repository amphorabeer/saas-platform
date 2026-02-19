import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRestaurantSessionFromRequest } from '@/lib/session';

/** GET /api/pos/orders/[id] — order detail with items */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRestaurantSessionFromRequest(req);
    const { id } = await params;

    const order = await prisma.restaurantOrder.findFirst({
      where: { id, restaurantId: session.restaurantId },
      include: {
        items: true,
        table: { select: { id: true, number: true, zone: { select: { name: true } } } },
        waiter: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    if (!order) {
      return NextResponse.json({ error: 'შეკვეთა ვერ მოიძებნა' }, { status: 404 });
    }

    const serialized = {
      ...order,
      subtotal: Number(order.subtotal),
      taxAmount: Number(order.taxAmount),
      discountAmount: Number(order.discountAmount),
      tipAmount: Number(order.tipAmount),
      totalAmount: Number(order.totalAmount),
      paidAmount: Number(order.paidAmount),
      changeAmount: Number(order.changeAmount),
      items: order.items.map((i) => ({
        ...i,
        quantity: Number(i.quantity),
        unitPrice: Number(i.unitPrice),
        totalPrice: Number(i.totalPrice),
        status: i.status ?? 'CONFIRMED',
      })),
    };
    return NextResponse.json(serialized);
  } catch (e: unknown) {
    console.error('[POS order GET]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unauthorized' },
      { status: 401 }
    );
  }
}

/** PUT /api/pos/orders/[id] — update order (notes, customer fields, discount, etc.) */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRestaurantSessionFromRequest(req);
    const { id } = await params;
    const body = await req.json();

    const order = await prisma.restaurantOrder.findFirst({
      where: { id, restaurantId: session.restaurantId },
    });
    if (!order) {
      return NextResponse.json({ error: 'შეკვეთა ვერ მოიძებნა' }, { status: 404 });
    }
    if (order.status === 'PAID' || order.status === 'CANCELLED') {
      return NextResponse.json(
        { error: 'შეკვეთის რედაქტირება შეუძლებელია' },
        { status: 400 }
      );
    }

    const updates: Record<string, unknown> = {};
    if (body.notes !== undefined) updates.notes = body.notes?.trim() || null;
    if (body.customerName !== undefined) updates.customerName = body.customerName?.trim() || null;
    if (body.customerPhone !== undefined) updates.customerPhone = body.customerPhone?.trim() || null;
    if (body.deliveryAddress !== undefined) updates.deliveryAddress = body.deliveryAddress?.trim() || null;
    if (body.discountAmount !== undefined) {
      const discountAmount = Number(body.discountAmount) || 0;
      updates.discountAmount = discountAmount;
      const subtotal = Number(order.subtotal);
      const taxAmount = Number(order.taxAmount);
      updates.totalAmount = Math.max(0, subtotal - discountAmount + taxAmount);
    }

    const updated = await prisma.restaurantOrder.update({
      where: { id },
      data: updates,
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
    console.error('[POS order PUT]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 }
    );
  }
}
