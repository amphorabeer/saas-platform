import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRestaurantSessionFromRequest } from '@/lib/session';

/** PUT — update expense */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRestaurantSessionFromRequest(req);
    const { id } = await params;
    const body = await req.json();
    const {
      categoryId,
      description,
      amount,
      date,
      paymentMethod,
      notes,
      isRecurring,
      recurringType,
    } = body as {
      categoryId?: string;
      description?: string;
      amount?: number;
      date?: string;
      paymentMethod?: string;
      notes?: string;
      isRecurring?: boolean;
      recurringType?: string;
    };

    const existing = await prisma.expense.findFirst({
      where: { id, restaurantId: session.restaurantId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const expense = await prisma.expense.update({
      where: { id },
      data: {
        ...(categoryId != null && { categoryId }),
        ...(description != null && { description: description.trim() }),
        ...(amount != null && { amount: Number(amount) }),
        ...(date != null && { date: new Date(date) }),
        ...(paymentMethod !== undefined && { paymentMethod: paymentMethod || null }),
        ...(notes !== undefined && { notes: notes || null }),
        ...(isRecurring !== undefined && { isRecurring: Boolean(isRecurring) }),
        ...(recurringType !== undefined && { recurringType: recurringType || null }),
      },
      include: { category: true },
    });

    return NextResponse.json({
      id: expense.id,
      categoryId: expense.categoryId,
      categoryName: expense.category.name,
      description: expense.description,
      amount: Number(expense.amount),
      date: expense.date.toISOString().slice(0, 10),
      paymentMethod: expense.paymentMethod,
      notes: expense.notes,
      isRecurring: expense.isRecurring,
      recurringType: expense.recurringType,
      updatedAt: expense.updatedAt.toISOString(),
    });
  } catch (e: unknown) {
    console.error('[finance expenses PUT]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unauthorized' },
      { status: 401 }
    );
  }
}

/** DELETE — delete expense */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRestaurantSessionFromRequest(req);
    const { id } = await params;

    const existing = await prisma.expense.findFirst({
      where: { id, restaurantId: session.restaurantId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await prisma.expense.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    console.error('[finance expenses DELETE]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unauthorized' },
      { status: 401 }
    );
  }
}
