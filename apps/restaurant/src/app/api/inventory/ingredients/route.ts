import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRestaurantSessionFromRequest } from '@/lib/session';
import { Decimal } from '@prisma/client/runtime/library';

/** GET /api/inventory/ingredients — list, filter: lowStock, expired, search; sort: name, currentStock */
export async function GET(req: NextRequest) {
  try {
    const session = await requireRestaurantSessionFromRequest(req);
    const { searchParams } = new URL(req.url);
    const lowStock = searchParams.get('lowStock') === 'true';
    const expired = searchParams.get('expired') === 'true';
    const search = searchParams.get('search')?.trim() || undefined;
    const sort = searchParams.get('sort') || 'name';

    const where: { restaurantId: string; name?: { contains: string; mode: 'insensitive' } } = {
      restaurantId: session.restaurantId,
    };
    if (search) where.name = { contains: search, mode: 'insensitive' };

    const ingredients = await prisma.ingredient.findMany({
      where,
      orderBy:
        sort === 'currentStock'
          ? [{ currentStock: 'asc' }]
          : sort === 'costPerUnit'
            ? [{ costPerUnit: 'desc' }]
            : [{ name: 'asc' }],
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let list = ingredients.map((i) => ({
      id: i.id,
      restaurantId: i.restaurantId,
      name: i.name,
      nameEn: i.nameEn,
      unit: i.unit,
      currentStock: Number(i.currentStock),
      minimumStock: Number(i.minimumStock),
      costPerUnit: i.costPerUnit != null ? Number(i.costPerUnit) : null,
      supplierId: i.supplierId,
      expiryDate: i.expiryDate?.toISOString().slice(0, 10) ?? null,
      isActive: i.isActive,
      createdAt: i.createdAt.toISOString(),
      updatedAt: i.updatedAt.toISOString(),
      isLowStock: Number(i.currentStock) < Number(i.minimumStock),
      isExpired: i.expiryDate ? new Date(i.expiryDate) < today : false,
    }));

    if (lowStock) list = list.filter((i) => i.isLowStock);
    if (expired) list = list.filter((i) => i.isExpired);

    return NextResponse.json(list);
  } catch (e: unknown) {
    console.error('[inventory ingredients GET]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unauthorized' },
      { status: 401 }
    );
  }
}

/** POST /api/inventory/ingredients — create */
export async function POST(req: Request) {
  try {
    const session = await requireRestaurantSessionFromRequest(req);
    const body = await req.json();
    const {
      name,
      nameEn,
      unit,
      currentStock,
      minimumStock,
      costPerUnit,
      supplierId,
      expiryDate,
      isActive,
    } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'სახელი აუცილებელია' }, { status: 400 });
    }

    const ingredient = await prisma.ingredient.create({
      data: {
        restaurantId: session.restaurantId,
        name: name.trim(),
        nameEn: nameEn?.trim() || null,
        unit: (unit?.trim() || 'ცალი') as string,
        currentStock: new Decimal(Number(currentStock) || 0),
        minimumStock: new Decimal(Number(minimumStock) || 0),
        costPerUnit: costPerUnit != null ? new Decimal(Number(costPerUnit)) : null,
        supplierId: supplierId?.trim() || null,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        isActive: isActive !== false,
      },
    });

    return NextResponse.json({
      ...ingredient,
      currentStock: Number(ingredient.currentStock),
      minimumStock: Number(ingredient.minimumStock),
      costPerUnit: ingredient.costPerUnit != null ? Number(ingredient.costPerUnit) : null,
      expiryDate: ingredient.expiryDate?.toISOString().slice(0, 10) ?? null,
    });
  } catch (e: unknown) {
    console.error('[inventory ingredients POST]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 }
    );
  }
}
