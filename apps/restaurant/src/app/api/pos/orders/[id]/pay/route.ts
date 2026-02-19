import { NextRequest, NextResponse } from 'next/server';
import { Decimal } from '@prisma/client/runtime/library';
import { prisma } from '@/lib/prisma';
import { requireRestaurantSessionFromRequest } from '@/lib/session';

/** PUT /api/pos/orders/[id]/pay — process payment, close session, update table */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRestaurantSessionFromRequest(req);
    const { id: orderId } = await params;
    const body = await req.json();
    const {
      paymentMethod,
      paidAmount,
      tipAmount,
      splits,
      discountAmount: bodyDiscountAmount,
      discountType: bodyDiscountType,
    } = body;

    const order = await prisma.restaurantOrder.findFirst({
      where: { id: orderId, restaurantId: session.restaurantId },
      include: {
        tableSession: true,
        table: true,
      },
    });
    if (!order) {
      return NextResponse.json({ error: 'შეკვეთა ვერ მოიძებნა' }, { status: 404 });
    }
    if (order.status === 'PAID') {
      return NextResponse.json(
        { error: 'შეკვეთა უკვე გადახდილია' },
        { status: 400 }
      );
    }

    // Calculate discount if sent from POS
    let discountNum = Number(order.discountAmount) || 0;
    if (bodyDiscountAmount !== undefined) {
      const subtotal = Number(order.subtotal);
      if (bodyDiscountType === 'percent') {
        discountNum = (subtotal * Number(bodyDiscountAmount)) / 100;
      } else {
        discountNum = Number(bodyDiscountAmount) || 0;
      }
    }

    // Recalculate total with discount
    const subtotal = Number(order.subtotal);
    const taxAmount = Number(order.taxAmount) || 0;
    const totalAmount = Math.max(0, subtotal - discountNum + taxAmount);

    const paidNum = Number(paidAmount) || totalAmount;
    const tipNum = Math.max(0, Number(tipAmount) || 0);

    if (Array.isArray(splits) && splits.length > 0) {
      const splitSum = splits.reduce((s: number, sp: { amount?: number }) => s + (Number(sp.amount) || 0), 0);
      if (Math.abs(splitSum - totalAmount) > 0.01) {
        return NextResponse.json(
          { error: 'გაყოფის ჯამი უნდა ემთხვეოდეს შეკვეთის ჯამს' },
          { status: 400 }
        );
      }
      for (const sp of splits) {
        await prisma.orderSplitPayment.create({
          data: {
            orderId,
            amount: new Decimal(Number(sp.amount) || 0),
            paymentMethod: String(sp.paymentMethod || 'cash'),
            paidBy: sp.paidBy?.trim() || null,
          },
        });
      }
    } else {
      await prisma.orderSplitPayment.create({
        data: {
          orderId,
          amount: new Decimal(totalAmount),
          paymentMethod: String(paymentMethod || 'cash'),
          paidBy: null,
        },
      });
    }

    const changeAmount = paymentMethod === 'cash' && paidNum > totalAmount ? paidNum - totalAmount : 0;

    await prisma.restaurantOrder.update({
      where: { id: orderId },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        paymentMethod: String(paymentMethod || 'cash'),
        paidAmount: new Decimal(paidNum),
        changeAmount: new Decimal(changeAmount),
        tipAmount: new Decimal(tipNum),
        discountAmount: new Decimal(discountNum),
        totalAmount: new Decimal(totalAmount),
      },
    });

    if (tipNum > 0) {
      await prisma.tip.create({
        data: {
          restaurantId: session.restaurantId,
          orderId,
          employeeId: order.waiterId || session.employeeId || null,
          amount: new Decimal(tipNum),
          isPool: false,
        },
      });
    }

    if (order.tableSession?.isActive) {
      await prisma.tableSession.update({
        where: { id: order.tableSessionId! },
        data: { endedAt: new Date(), isActive: false },
      });
    }
    if (order.tableId) {
      await prisma.restaurantTable.update({
        where: { id: order.tableId },
        data: { status: 'CLEANING' },
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
    console.error('[POS order pay]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 }
    );
  }
}