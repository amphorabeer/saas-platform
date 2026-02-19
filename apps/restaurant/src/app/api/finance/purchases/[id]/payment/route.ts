import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRestaurantSessionFromRequest } from '@/lib/session';

/** POST — register payment; body: { amount, paymentMethod, notes? } */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRestaurantSessionFromRequest(req);
    const { id } = await params;
    const body = await req.json();
    const { amount, paymentMethod, notes } = body as { amount?: number; paymentMethod?: string; notes?: string };

    if (amount == null || Number(amount) <= 0 || !paymentMethod?.trim()) {
      return NextResponse.json(
        { error: 'amount (positive number) and paymentMethod are required' },
        { status: 400 }
      );
    }

    const p = await prisma.purchaseInvoice.findFirst({
      where: { id, restaurantId: session.restaurantId },
      include: { payments: true },
    });
    if (!p) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (p.status === 'CANCELLED') {
      return NextResponse.json({ error: 'Purchase is cancelled' }, { status: 400 });
    }

    const payAmount = Number(amount);
    await prisma.purchasePayment.create({
      data: {
        purchaseId: id,
        amount: payAmount,
        paymentMethod: paymentMethod.trim(),
        notes: notes ?? undefined,
      },
    });

    const newPaid = Number(p.paidAmount) + payAmount;
    const total = Number(p.totalAmount);
    const isPaid = newPaid >= total;
    await prisma.purchaseInvoice.update({
      where: { id },
      data: {
        paidAmount: newPaid,
        status: isPaid ? 'PAID' : 'PARTIAL',
        ...(isPaid && { paidAt: new Date() }),
      },
    });

    const updated = await prisma.purchaseInvoice.findUnique({
      where: { id },
      include: { payments: true },
    });

    return NextResponse.json({
      id: updated!.id,
      paidAmount: Number(updated!.paidAmount),
      totalAmount: Number(updated!.totalAmount),
      status: updated!.status,
      paidAt: updated!.paidAt?.toISOString() ?? null,
    });
  } catch (e: unknown) {
    console.error('[finance purchases payment POST]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unauthorized' },
      { status: 401 }
    );
  }
}
