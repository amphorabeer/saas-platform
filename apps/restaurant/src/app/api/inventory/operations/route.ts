import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRestaurantSessionFromRequest } from '@/lib/session';

const TYPES = ['INCOMING', 'WRITE_OFF', 'ADJUSTMENT', 'TRANSFER', 'AUTO_DEDUCTION'] as const;

/** GET /api/inventory/operations — history, filter: ingredientId, type, dateFrom, dateTo; pagination */
export async function GET(req: NextRequest) {
  try {
    const session = await requireRestaurantSessionFromRequest(req);
    const { searchParams } = new URL(req.url);
    const ingredientId = searchParams.get('ingredientId') || undefined;
    const type = searchParams.get('type') || undefined;
    const dateFrom = searchParams.get('dateFrom') || undefined;
    const dateTo = searchParams.get('dateTo') || undefined;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize = Math.min(50, Math.max(10, parseInt(searchParams.get('pageSize') || '20', 10)));
    const skip = (page - 1) * pageSize;

    const where: {
      restaurantId: string;
      ingredientId?: string;
      type?: (typeof TYPES)[number];
      createdAt?: { gte?: Date; lte?: Date };
    } = { restaurantId: session.restaurantId };
    if (ingredientId) where.ingredientId = ingredientId;
    if (type && TYPES.includes(type as (typeof TYPES)[number])) where.type = type as (typeof TYPES)[number];
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) {
        const d = new Date(dateTo);
        d.setHours(23, 59, 59, 999);
        where.createdAt.lte = d;
      }
    }

    const [operations, total] = await Promise.all([
      prisma.ingredientOperation.findMany({
        where,
        include: {
          ingredient: { select: { id: true, name: true, unit: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.ingredientOperation.count({ where }),
    ]);

    const list = operations.map((op) => ({
      id: op.id,
      restaurantId: op.restaurantId,
      ingredientId: op.ingredientId,
      type: op.type,
      quantity: Number(op.quantity),
      unitCost: op.unitCost != null ? Number(op.unitCost) : null,
      reference: op.reference,
      notes: op.notes,
      performedBy: op.performedBy,
      createdAt: op.createdAt.toISOString(),
      ingredient: op.ingredient,
    }));

    return NextResponse.json({
      items: list,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (e: unknown) {
    console.error('[inventory operations GET]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unauthorized' },
      { status: 401 }
    );
  }
}
