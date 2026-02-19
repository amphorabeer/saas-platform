import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRestaurantSessionFromRequest } from '@/lib/session';
import { Decimal } from '@prisma/client/runtime/library';

/** GET /api/inventory/ingredients/[id] */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRestaurantSessionFromRequest(req);
    const { id } = await params;

    const ingredient = await prisma.ingredient.findFirst({
      where: { id, restaurantId: session.restaurantId },
    });
    if (!ingredient) {
      return NextResponse.json({ error: 'ინგრედიენტი ვერ მოიძებნა' }, { status: 404 });
    }

    return NextResponse.json({
      ...ingredient,
      currentStock: Number(ingredient.currentStock),
      minimumStock: Number(ingredient.minimumStock),
      costPerUnit: ingredient.costPerUnit != null ? Number(ingredient.costPerUnit) : null,
      expiryDate: ingredient.expiryDate?.toISOString().slice(0, 10) ?? null,
    });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unauthorized' },
      { status: 401 }
    );
  }
}

/** PUT /api/inventory/ingredients/[id] */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRestaurantSessionFromRequest(req);
    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.ingredient.findFirst({
      where: { id, restaurantId: session.restaurantId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'ინგრედიენტი ვერ მოიძებნა' }, { status: 404 });
    }

    const updates: {
      name?: string;
      nameEn?: string | null;
      unit?: string;
      currentStock?: Decimal;
      minimumStock?: Decimal;
      costPerUnit?: Decimal | null;
      supplierId?: string | null;
      expiryDate?: Date | null;
      isActive?: boolean;
    } = {};
    if (body.name !== undefined) updates.name = String(body.name).trim();
    if (body.nameEn !== undefined) updates.nameEn = body.nameEn?.trim() || null;
    if (body.unit !== undefined) updates.unit = String(body.unit).trim() || existing.unit;
    if (body.currentStock !== undefined) updates.currentStock = new Decimal(Number(body.currentStock) || 0);
    if (body.minimumStock !== undefined) updates.minimumStock = new Decimal(Number(body.minimumStock) || 0);
    if (body.costPerUnit !== undefined)
      updates.costPerUnit = body.costPerUnit != null ? new Decimal(Number(body.costPerUnit)) : null;
    if (body.supplierId !== undefined) updates.supplierId = body.supplierId?.trim() || null;
    if (body.expiryDate !== undefined) updates.expiryDate = body.expiryDate ? new Date(body.expiryDate) : null;
    if (typeof body.isActive === 'boolean') updates.isActive = body.isActive;

    const updated = await prisma.ingredient.update({
      where: { id },
      data: updates,
    });

    return NextResponse.json({
      ...updated,
      currentStock: Number(updated.currentStock),
      minimumStock: Number(updated.minimumStock),
      costPerUnit: updated.costPerUnit != null ? Number(updated.costPerUnit) : null,
      expiryDate: updated.expiryDate?.toISOString().slice(0, 10) ?? null,
    });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 }
    );
  }
}

/** DELETE /api/inventory/ingredients/[id] */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRestaurantSessionFromRequest(req);
    const { id } = await params;

    const existing = await prisma.ingredient.findFirst({
      where: { id, restaurantId: session.restaurantId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'ინგრედიენტი ვერ მოიძებნა' }, { status: 404 });
    }

    await prisma.ingredient.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 }
    );
  }
}
