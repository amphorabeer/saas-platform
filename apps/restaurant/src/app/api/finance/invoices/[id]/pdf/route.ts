import { NextRequest, NextResponse } from 'next/server';
import { requireRestaurantSessionFromRequest } from '@/lib/session';
import { prisma } from '@/lib/prisma';

/** GET — invoice PDF (stub: returns JSON; integrate jspdf + NotoSansGeorgian for full PDF) */
export async function GET(
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

    // TODO: use jspdf + jspdf-autotable + base64 NotoSansGeorgian for PDF generation
    // For now return invoice data for client-side or external PDF generation
    return NextResponse.json({
      invoiceNumber: inv.invoiceNumber,
      customerName: inv.customerName,
      customerPhone: inv.customerPhone,
      issueDate: inv.issueDate.toISOString().slice(0, 10),
      dueDate: inv.dueDate?.toISOString().slice(0, 10) ?? null,
      items: inv.items.map((i) => ({
        description: i.description,
        quantity: Number(i.quantity),
        unitPrice: Number(i.unitPrice),
        totalPrice: Number(i.totalPrice),
      })),
      subtotal: Number(inv.subtotal),
      taxAmount: Number(inv.taxAmount),
      discountAmount: Number(inv.discountAmount),
      totalAmount: Number(inv.totalAmount),
      paidAmount: Number(inv.paidAmount),
      status: inv.status,
    });
  } catch (e: unknown) {
    console.error('[finance invoices PDF GET]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unauthorized' },
      { status: 401 }
    );
  }
}
