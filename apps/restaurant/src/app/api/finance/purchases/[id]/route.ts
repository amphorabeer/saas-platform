import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRestaurantSessionFromRequest } from '@/lib/session';

/** GET — purchase by id */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRestaurantSessionFromRequest(req);
    const { id } = await params;

    const p = await prisma.purchaseInvoice.findFirst({
      where: { id, restaurantId: session.restaurantId },
      include: { items: true, payments: true, supplier: true },
    });
    if (!p) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: p.id,
      invoiceNumber: p.invoiceNumber,
      supplierId: p.supplierId,
      supplierName: p.supplierName,
      supplierTaxId: p.supplierTaxId,
      issueDate: p.issueDate.toISOString().slice(0, 10),
      dueDate: p.dueDate?.toISOString().slice(0, 10) ?? null,
      subtotal: Number(p.subtotal),
      taxAmount: Number(p.taxAmount),
      totalAmount: Number(p.totalAmount),
      paidAmount: Number(p.paidAmount),
      status: p.status,
      notes: p.notes,
      items: p.items.map((i) => ({
        id: i.id,
        ingredientId: i.ingredientId,
        description: i.description,
        quantity: Number(i.quantity),
        unit: i.unit,
        unitPrice: Number(i.unitPrice),
        totalPrice: Number(i.totalPrice),
      })),
      payments: p.payments.map((pay) => ({
        id: pay.id,
        amount: Number(pay.amount),
        paymentMethod: pay.paymentMethod,
        paidAt: pay.paidAt.toISOString(),
      })),
    });
  } catch (e: unknown) {
    console.error('[finance purchases GET id]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unauthorized' },
      { status: 401 }
    );
  }
}

/** DELETE — delete purchase; rollback ingredient stock for items with ingredientId */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRestaurantSessionFromRequest(req);
    const { id } = await params;

    const p = await prisma.purchaseInvoice.findFirst({
      where: { id, restaurantId: session.restaurantId },
      include: { items: true },
    });
    if (!p) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    for (const item of p.items) {
      if (item.ingredientId) {
        await prisma.ingredient.updateMany({
          where: { id: item.ingredientId, restaurantId: session.restaurantId },
          data: { currentStock: { decrement: Number(item.quantity) } },
        });
      }
    }

    await prisma.purchaseInvoice.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    console.error('[finance purchases DELETE]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unauthorized' },
      { status: 401 }
    );
  }
}
