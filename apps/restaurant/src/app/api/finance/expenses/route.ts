import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRestaurantSessionFromRequest } from '@/lib/session';

/** GET — expenses list, filters: dateFrom, dateTo, categoryId, page, limit */
export async function GET(req: NextRequest) {
  try {
    const session = await requireRestaurantSessionFromRequest(req);
    const { searchParams } = new URL(req.url);
    const dateFrom = searchParams.get('dateFrom') || undefined;
    const dateTo = searchParams.get('dateTo') || undefined;
    const categoryId = searchParams.get('categoryId') || undefined;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(10, parseInt(searchParams.get('limit') || '20', 10)));

    const where: { restaurantId: string; categoryId?: string; date?: { gte?: Date; lte?: Date } } = {
      restaurantId: session.restaurantId,
    };
    if (categoryId) where.categoryId = categoryId;
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = new Date(dateFrom);
      if (dateTo) {
        const d = new Date(dateTo);
        d.setHours(23, 59, 59, 999);
        where.date.lte = d;
      }
    }

    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({
        where,
        include: { category: true },
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.expense.count({ where }),
    ]);

    const items = expenses.map((e) => ({
      id: e.id,
      categoryId: e.categoryId,
      categoryName: e.category.name,
      categoryIcon: e.category.icon,
      categoryColor: e.category.color,
      description: e.description,
      amount: Number(e.amount),
      date: e.date.toISOString().slice(0, 10),
      paymentMethod: e.paymentMethod,
      notes: e.notes,
      isRecurring: e.isRecurring,
      recurringType: e.recurringType,
      createdAt: e.createdAt.toISOString(),
    }));

    return NextResponse.json({
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (e: unknown) {
    console.error('[finance expenses GET]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unauthorized' },
      { status: 401 }
    );
  }
}

/** POST — new expense */
export async function POST(req: NextRequest) {
  try {
    const session = await requireRestaurantSessionFromRequest(req);
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

    if (!categoryId || !description?.trim() || amount == null || !date) {
      return NextResponse.json(
        { error: 'categoryId, description, amount, date are required' },
        { status: 400 }
      );
    }

    const expense = await prisma.expense.create({
      data: {
        restaurantId: session.restaurantId,
        categoryId,
        description: description.trim(),
        amount: Number(amount),
        date: new Date(date),
        paymentMethod: paymentMethod ?? undefined,
        notes: notes ?? undefined,
        isRecurring: Boolean(isRecurring),
        recurringType: recurringType ?? undefined,
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
      createdAt: expense.createdAt.toISOString(),
    });
  } catch (e: unknown) {
    console.error('[finance expenses POST]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unauthorized' },
      { status: 401 }
    );
  }
}
