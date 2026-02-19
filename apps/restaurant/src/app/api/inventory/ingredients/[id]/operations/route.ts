import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRestaurantSessionFromRequest } from '@/lib/session';
import { Decimal } from '@prisma/client/runtime/library';

const VALID_TYPES = ['INCOMING', 'WRITE_OFF', 'ADJUSTMENT'] as const;

/** POST /api/inventory/ingredients/[id]/operations — stock operation */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRestaurantSessionFromRequest(req);
    const { id: ingredientId } = await params;
    const body = await req.json();
    const { type, quantity, unitCost, reference, notes } = body;

    if (!VALID_TYPES.includes(type)) {
      return NextResponse.json(
        { error: 'ტიპი უნდა იყოს INCOMING, WRITE_OFF ან ADJUSTMENT' },
        { status: 400 }
      );
    }

    const qty = Number(quantity);
    if (isNaN(qty) || qty <= 0) {
      return NextResponse.json({ error: 'რაოდენობა უნდა იყოს დადებითი' }, { status: 400 });
    }

    const ingredient = await prisma.ingredient.findFirst({
      where: { id: ingredientId, restaurantId: session.restaurantId },
    });
    if (!ingredient) {
      return NextResponse.json({ error: 'ინგრედიენტი ვერ მოიძებნა' }, { status: 404 });
    }

    const currentStock = Number(ingredient.currentStock);
    const costPerUnit = ingredient.costPerUnit != null ? Number(ingredient.costPerUnit) : 0;

    let newStock: number;
    let newCostPerUnit: number | null = ingredient.costPerUnit != null ? costPerUnit : null;
    let opQuantity: number;

    if (type === 'INCOMING') {
      newStock = currentStock + qty;
      const unitCostNum = unitCost != null ? Number(unitCost) : costPerUnit;
      if (newStock > 0 && (unitCostNum > 0 || costPerUnit > 0)) {
        newCostPerUnit =
          (currentStock * costPerUnit + qty * unitCostNum) / (currentStock + qty);
      }
      opQuantity = qty;
    } else if (type === 'WRITE_OFF') {
      if (qty > currentStock) {
        return NextResponse.json(
          { error: 'რაოდენობა აღემატება მარაგს' },
          { status: 400 }
        );
      }
      newStock = currentStock - qty;
      opQuantity = -qty;
    } else {
      // ADJUSTMENT: absolute set
      newStock = qty;
      opQuantity = qty - currentStock;
    }

    const performedBy = session.name || session.email || '';

    await prisma.$transaction([
      prisma.ingredient.update({
        where: { id: ingredientId },
        data: {
          currentStock: new Decimal(newStock),
          ...(newCostPerUnit != null && { costPerUnit: new Decimal(newCostPerUnit) }),
        },
      }),
      prisma.ingredientOperation.create({
        data: {
          restaurantId: session.restaurantId,
          ingredientId,
          type,
          quantity: new Decimal(opQuantity),
          unitCost: unitCost != null ? new Decimal(Number(unitCost)) : null,
          reference: reference?.trim() || null,
          notes: notes?.trim() || null,
          performedBy: performedBy || null,
        },
      }),
    ]);

    const updated = await prisma.ingredient.findUnique({
      where: { id: ingredientId },
    });

    return NextResponse.json({
      ok: true,
      currentStock: Number(updated!.currentStock),
      costPerUnit: updated!.costPerUnit != null ? Number(updated!.costPerUnit) : null,
    });
  } catch (e: unknown) {
    console.error('[inventory operations POST]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 }
    );
  }
}
