import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRestaurantSessionFromRequest } from '@/lib/session';

function toNum(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === 'number' && !Number.isNaN(v)) return v;
  return Number(v) || 0;
}

/** GET — invoices list; filters: status, dateFrom, dateTo, search, page, limit */
export async function GET(req: NextRequest) {
  try {
    const session = await requireRestaurantSessionFromRequest(req);
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || undefined;
    const dateFrom = searchParams.get('dateFrom') || undefined;
    const dateTo = searchParams.get('dateTo') || undefined;
    const search = searchParams.get('search')?.trim() || undefined;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(10, parseInt(searchParams.get('limit') || '20', 10)));

    const where: {
      restaurantId: string;
      status?: string;
      issueDate?: { gte?: Date; lte?: Date };
      OR?: Array<{ customerName?: { contains: string; mode: 'insensitive' }; invoiceNumber?: { contains: string; mode: 'insensitive' } }>;
    } = { restaurantId: session.restaurantId };

    if (status && ['DRAFT', 'SENT', 'PAID', 'PARTIAL', 'OVERDUE', 'CANCELLED'].includes(status)) {
      where.status = status;
    }
    if (dateFrom || dateTo) {
      where.issueDate = {};
      if (dateFrom) where.issueDate.gte = new Date(dateFrom);
      if (dateTo) {
        const d = new Date(dateTo);
        d.setHours(23, 59, 59, 999);
        where.issueDate.lte = d;
      }
    }
    if (search) {
      where.OR = [
        { customerName: { contains: search, mode: 'insensitive' } },
        { invoiceNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [invoices, total] = await Promise.all([
      prisma.restaurantInvoice.findMany({
        where,
        include: { items: true, payments: true },
        orderBy: { issueDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.restaurantInvoice.count({ where }),
    ]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const items = invoices.map((inv) => {
      let displayStatus = inv.status;
      if (inv.status === 'SENT' && inv.dueDate && new Date(inv.dueDate) < today) {
        displayStatus = 'OVERDUE';
      }
      return {
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        type: inv.type,
        customerName: inv.customerName,
        customerTaxId: inv.customerTaxId ?? null,
        customerAddress: inv.customerAddress ?? null,
        customerPhone: inv.customerPhone ?? null,
        customerEmail: inv.customerEmail ?? null,
        issueDate: inv.issueDate.toISOString().slice(0, 10),
        dueDate: inv.dueDate?.toISOString().slice(0, 10) ?? null,
        subtotal: Number(inv.subtotal),
        taxAmount: Number(inv.taxAmount),
        discountAmount: Number(inv.discountAmount),
        totalAmount: Number(inv.totalAmount),
        paidAmount: Number(inv.paidAmount),
        status: displayStatus,
        paidAt: inv.paidAt?.toISOString() ?? null,
        notes: inv.notes ?? null,
        orderId: inv.orderId,
        itemsCount: inv.items.length,
      };
    });

    return NextResponse.json({
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (e: unknown) {
    console.error('[finance invoices GET]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unauthorized' },
      { status: 401 }
    );
  }
}

/** POST — new invoice */
export async function POST(req: NextRequest) {
  try {
    const session = await requireRestaurantSessionFromRequest(req);
    const body = await req.json();
    const {
      customerName,
      customerPhone,
      customerEmail,
      customerAddress,
      customerTaxId,
      type,
      issueDate,
      dueDate,
      taxRate,
      discountAmount,
      notes,
      orderId,
      items: itemsInput,
    } = body as {
      customerName?: string;
      customerPhone?: string;
      customerEmail?: string;
      customerAddress?: string;
      customerTaxId?: string;
      type?: string;
      issueDate?: string;
      dueDate?: string;
      taxRate?: number;
      discountAmount?: number;
      notes?: string;
      orderId?: string;
      items?: Array<{ description: string; quantity: number; unitPrice: number }>;
    };

    if (!customerName?.trim() || !Array.isArray(itemsInput) || itemsInput.length === 0) {
      return NextResponse.json(
        { error: 'customerName and items (array with description, quantity, unitPrice) are required' },
        { status: 400 }
      );
    }

    const year = new Date().getFullYear();
    const last = await prisma.restaurantInvoice.findFirst({
      where: { restaurantId: session.restaurantId, invoiceNumber: { startsWith: `INV-${year}-` } },
      orderBy: { invoiceNumber: 'desc' },
      select: { invoiceNumber: true },
    });
    const nextNum = last
      ? parseInt(last.invoiceNumber.replace(`INV-${year}-`, ''), 10) + 1
      : 1;
    const invoiceNumber = `INV-${year}-${String(nextNum).padStart(4, '0')}`;

    const subtotal = itemsInput.reduce((s, i) => s + toNum(i.quantity) * toNum(i.unitPrice), 0);
    const taxRateVal = toNum(taxRate);
    const taxAmount = (subtotal - toNum(discountAmount)) * (taxRateVal / 100);
    const totalAmount = Math.max(0, subtotal - toNum(discountAmount) + taxAmount);

    const issueDateVal = issueDate ? new Date(issueDate) : new Date();
    let dueDateVal: Date | undefined;
    if (dueDate) {
      dueDateVal = new Date(dueDate);
    } else {
      const d = new Date(issueDateVal);
      d.setDate(d.getDate() + 14);
      dueDateVal = d;
    }

    const invoice = await prisma.restaurantInvoice.create({
      data: {
        restaurantId: session.restaurantId,
        invoiceNumber,
        type: type === 'PROFORMA' || type === 'CREDIT' ? type : 'SALE',
        customerName: customerName.trim(),
        customerPhone: customerPhone ?? undefined,
        customerEmail: customerEmail ?? undefined,
        customerAddress: customerAddress ?? undefined,
        customerTaxId: customerTaxId ?? undefined,
        issueDate: issueDateVal,
        dueDate: dueDateVal,
        taxRate: taxRateVal,
        discountAmount: toNum(discountAmount),
        subtotal,
        taxAmount,
        totalAmount,
        notes: notes ?? undefined,
        orderId: orderId ?? undefined,
        status: 'DRAFT',
      },
    });

    for (const it of itemsInput) {
      const qty = toNum(it.quantity);
      const up = toNum(it.unitPrice);
      await prisma.restaurantInvoiceItem.create({
        data: {
          invoiceId: invoice.id,
          description: String(it.description ?? '').trim() || 'Item',
          quantity: qty,
          unitPrice: up,
          totalPrice: qty * up,
        },
      });
    }

    const created = await prisma.restaurantInvoice.findUnique({
      where: { id: invoice.id },
      include: { items: true },
    });

    return NextResponse.json({
      id: created!.id,
      invoiceNumber: created!.invoiceNumber,
      totalAmount: Number(created!.totalAmount),
      status: created!.status,
      items: created!.items.map((i) => ({
        id: i.id,
        description: i.description,
        quantity: Number(i.quantity),
        unitPrice: Number(i.unitPrice),
        totalPrice: Number(i.totalPrice),
      })),
    });
  } catch (e: unknown) {
    console.error('[finance invoices POST]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unauthorized' },
      { status: 401 }
    );
  }
}
