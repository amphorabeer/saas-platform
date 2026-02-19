import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRestaurantSessionFromRequest } from '@/lib/session';

function toNum(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === 'number' && !Number.isNaN(v)) return v;
  return Number(v) || 0;
}

/** GET — purchases list; filters: status, supplierId, dateFrom, dateTo, page, limit */
export async function GET(req: NextRequest) {
  try {
    const session = await requireRestaurantSessionFromRequest(req);
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || undefined;
    const supplierId = searchParams.get('supplierId') || undefined;
    const dateFrom = searchParams.get('dateFrom') || undefined;
    const dateTo = searchParams.get('dateTo') || undefined;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(10, parseInt(searchParams.get('limit') || '20', 10)));

    const where: {
      restaurantId: string;
      status?: string;
      supplierId?: string;
      issueDate?: { gte?: Date; lte?: Date };
    } = { restaurantId: session.restaurantId };

    if (status && ['PENDING', 'PAID', 'PARTIAL', 'OVERDUE', 'CANCELLED'].includes(status)) {
      where.status = status;
    }
    if (supplierId) where.supplierId = supplierId;
    if (dateFrom || dateTo) {
      where.issueDate = {};
      if (dateFrom) where.issueDate.gte = new Date(dateFrom);
      if (dateTo) {
        const d = new Date(dateTo);
        d.setHours(23, 59, 59, 999);
        where.issueDate.lte = d;
      }
    }

    const [purchases, total] = await Promise.all([
      prisma.purchaseInvoice.findMany({
        where,
        include: { items: true, supplier: true },
        orderBy: { issueDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.purchaseInvoice.count({ where }),
    ]);

    const items = purchases.map((p) => ({
      id: p.id,
      invoiceNumber: p.invoiceNumber,
      supplierName: p.supplierName,
      supplierId: p.supplierId,
      issueDate: p.issueDate.toISOString().slice(0, 10),
      dueDate: p.dueDate?.toISOString().slice(0, 10) ?? null,
      totalAmount: Number(p.totalAmount),
      paidAmount: Number(p.paidAmount),
      status: p.status,
      itemsCount: p.items.length,
    }));

    return NextResponse.json({
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (e: unknown) {
    console.error('[finance purchases GET]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unauthorized' },
      { status: 401 }
    );
  }
}

/** POST — new purchase; items with ingredientId update stock */
export async function POST(req: NextRequest) {
  try {
    const session = await requireRestaurantSessionFromRequest(req);
    const body = await req.json();
    const {
      invoiceNumber,
      supplierId,
      supplierName,
      supplierTaxId,
      issueDate,
      dueDate,
      notes,
      items: itemsInput,
    } = body as {
      invoiceNumber?: string;
      supplierId?: string;
      supplierName?: string;
      supplierTaxId?: string;
      issueDate?: string;
      dueDate?: string;
      notes?: string;
      items?: Array<{ ingredientId?: string; description: string; quantity: number; unit?: string; unitPrice: number }>;
    };

    if (!supplierName?.trim() || !Array.isArray(itemsInput) || itemsInput.length === 0) {
      return NextResponse.json(
        { error: 'supplierName and items (array) are required' },
        { status: 400 }
      );
    }

    const invNum = invoiceNumber?.trim() || `PUR-${Date.now()}`;
    let subtotal = 0;
    const createdItems: { ingredientId: string | null; quantity: number }[] = [];

    const purchase = await prisma.purchaseInvoice.create({
      data: {
        restaurantId: session.restaurantId,
        invoiceNumber: invNum,
        supplierId: supplierId || undefined,
        supplierName: supplierName.trim(),
        supplierTaxId: supplierTaxId ?? undefined,
        issueDate: issueDate ? new Date(issueDate) : undefined,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        notes: notes ?? undefined,
        subtotal: 0,
        taxAmount: 0,
        totalAmount: 0,
        paidAmount: 0,
        status: 'PENDING',
      },
    });

    for (const it of itemsInput) {
      const qty = toNum(it.quantity);
      const up = toNum(it.unitPrice);
      const total = qty * up;
      subtotal += total;
      await prisma.purchaseInvoiceItem.create({
        data: {
          purchaseId: purchase.id,
          ingredientId: it.ingredientId || undefined,
          description: String(it.description ?? '').trim() || 'Item',
          quantity: qty,
          unit: it.unit ?? undefined,
          unitPrice: up,
          totalPrice: total,
        },
      });
      if (it.ingredientId) {
        createdItems.push({ ingredientId: it.ingredientId, quantity: qty });
      }
    }

    await prisma.purchaseInvoice.update({
      where: { id: purchase.id },
      data: { subtotal, totalAmount: subtotal },
    });

    for (const { ingredientId, quantity } of createdItems) {
      if (!ingredientId) continue;
      await prisma.ingredient.updateMany({
        where: { id: ingredientId, restaurantId: session.restaurantId },
        data: { currentStock: { increment: quantity } },
      });
    }

    const created = await prisma.purchaseInvoice.findUnique({
      where: { id: purchase.id },
      include: { items: true },
    });

    return NextResponse.json({
      id: created!.id,
      invoiceNumber: created!.invoiceNumber,
      totalAmount: Number(created!.totalAmount),
      status: created!.status,
    });
  } catch (e: unknown) {
    console.error('[finance purchases POST]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unauthorized' },
      { status: 401 }
    );
  }
}
