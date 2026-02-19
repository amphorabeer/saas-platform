import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRestaurantSessionFromRequest } from '@/lib/session';

/** GET — invoice by id with items and payments */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRestaurantSessionFromRequest(req);
    const { id } = await params;

    const inv = await prisma.restaurantInvoice.findFirst({
      where: { id, restaurantId: session.restaurantId },
      include: { items: true, payments: true, order: { select: { orderNumber: true } } },
    });
    if (!inv) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let status = inv.status;
    if (inv.status === 'SENT' && inv.dueDate && new Date(inv.dueDate) < today) {
      status = 'OVERDUE';
    }

    return NextResponse.json({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      type: inv.type,
      customerName: inv.customerName,
      customerPhone: inv.customerPhone,
      customerEmail: inv.customerEmail,
      customerAddress: inv.customerAddress,
      customerTaxId: inv.customerTaxId,
      issueDate: inv.issueDate.toISOString().slice(0, 10),
      dueDate: inv.dueDate?.toISOString().slice(0, 10) ?? null,
      subtotal: Number(inv.subtotal),
      taxRate: Number(inv.taxRate),
      taxAmount: Number(inv.taxAmount),
      discountAmount: Number(inv.discountAmount),
      totalAmount: Number(inv.totalAmount),
      paidAmount: Number(inv.paidAmount),
      status,
      paidAt: inv.paidAt?.toISOString() ?? null,
      notes: inv.notes,
      orderId: inv.orderId,
      orderNumber: inv.order?.orderNumber ?? null,
      items: inv.items.map((i) => ({
        id: i.id,
        description: i.description,
        quantity: Number(i.quantity),
        unitPrice: Number(i.unitPrice),
        totalPrice: Number(i.totalPrice),
      })),
      payments: inv.payments.map((p) => ({
        id: p.id,
        amount: Number(p.amount),
        paymentMethod: p.paymentMethod,
        paidAt: p.paidAt.toISOString(),
        notes: p.notes,
      })),
    });
  } catch (e: unknown) {
    console.error('[finance invoices GET id]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unauthorized' },
      { status: 401 }
    );
  }
}

/** PUT — update invoice (DRAFT only) */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRestaurantSessionFromRequest(req);
    const { id } = await params;
    const inv = await prisma.restaurantInvoice.findFirst({
      where: { id, restaurantId: session.restaurantId },
      include: { items: true },
    });
    if (!inv) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (inv.status !== 'DRAFT') {
      return NextResponse.json({ error: 'Only DRAFT invoices can be edited' }, { status: 400 });
    }

    const body = await req.json();
    const { customerName, customerPhone, customerEmail, customerAddress, customerTaxId, issueDate, dueDate, taxRate, discountAmount, notes, items: itemsInput } = body;

    const updateData: Record<string, unknown> = {};
    if (customerName != null) updateData.customerName = String(customerName).trim();
    if (customerPhone !== undefined) updateData.customerPhone = customerPhone || null;
    if (customerEmail !== undefined) updateData.customerEmail = customerEmail || null;
    if (customerAddress !== undefined) updateData.customerAddress = customerAddress || null;
    if (customerTaxId !== undefined) updateData.customerTaxId = customerTaxId || null;
    if (issueDate != null) updateData.issueDate = new Date(issueDate);
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
    if (taxRate != null) updateData.taxRate = Number(taxRate);
    if (discountAmount != null) updateData.discountAmount = Number(discountAmount);
    if (notes !== undefined) updateData.notes = notes || null;

    if (Object.keys(updateData).length > 0) {
      await prisma.restaurantInvoice.update({ where: { id }, data: updateData as never });
    }

    if (Array.isArray(itemsInput)) {
      await prisma.restaurantInvoiceItem.deleteMany({ where: { invoiceId: id } });
      let subtotal = 0;
      for (const it of itemsInput) {
        const qty = Number(it.quantity) || 0;
        const up = Number(it.unitPrice) || 0;
        const total = qty * up;
        subtotal += total;
        await prisma.restaurantInvoiceItem.create({
          data: {
            invoiceId: id,
            description: String(it.description ?? '').trim() || 'Item',
            quantity: qty,
            unitPrice: up,
            totalPrice: total,
          },
        });
      }
      const inv2 = await prisma.restaurantInvoice.findUnique({ where: { id } });
      if (inv2) {
        const taxRateVal = Number(inv2.taxRate) || 0;
        const discount = Number(inv2.discountAmount) || 0;
        const taxAmount = (subtotal - discount) * (taxRateVal / 100);
        const totalAmount = Math.max(0, subtotal - discount + taxAmount);
        await prisma.restaurantInvoice.update({
          where: { id },
          data: { subtotal, taxAmount, totalAmount },
        });
      }
    }

    const updated = await prisma.restaurantInvoice.findUnique({
      where: { id },
      include: { items: true },
    });
    return NextResponse.json({
      id: updated!.id,
      totalAmount: Number(updated!.totalAmount),
      items: updated!.items.map((i) => ({ id: i.id, description: i.description, quantity: Number(i.quantity), unitPrice: Number(i.unitPrice), totalPrice: Number(i.totalPrice) })),
    });
  } catch (e: unknown) {
    console.error('[finance invoices PUT]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unauthorized' },
      { status: 401 }
    );
  }
}

/** DELETE — delete invoice (DRAFT only) */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRestaurantSessionFromRequest(req);
    const { id } = await params;
    const inv = await prisma.restaurantInvoice.findFirst({
      where: { id, restaurantId: session.restaurantId },
    });
    if (!inv) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (inv.status !== 'DRAFT') {
      return NextResponse.json({ error: 'Only DRAFT invoices can be deleted' }, { status: 400 });
    }
    await prisma.restaurantInvoice.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    console.error('[finance invoices DELETE]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unauthorized' },
      { status: 401 }
    );
  }
}
