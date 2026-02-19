import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRestaurantSessionFromRequest } from '@/lib/session';

/** GET /api/purchases/suppliers — unique supplierId values from ingredients (text-based) */
export async function GET(req: NextRequest) {
  try {
    const session = await requireRestaurantSessionFromRequest(req);

    const ingredients = await prisma.ingredient.findMany({
      where: {
        restaurantId: session.restaurantId,
        supplierId: { not: null },
        isActive: true,
      },
      select: {
        supplierId: true,
        id: true,
        name: true,
        currentStock: true,
        costPerUnit: true,
      },
    });

    const bySupplier = new Map<
      string,
      { supplierId: string; ingredients: { id: string; name: string; currentStock: number; costPerUnit: number | null }[]; totalValue: number }
    >();

    for (const i of ingredients) {
      const sid = (i.supplierId || '').trim();
      if (!sid) continue;
      if (!bySupplier.has(sid)) {
        bySupplier.set(sid, {
          supplierId: sid,
          ingredients: [],
          totalValue: 0,
        });
      }
      const row = bySupplier.get(sid)!;
      const stock = Number(i.currentStock);
      const cost = i.costPerUnit != null ? Number(i.costPerUnit) : 0;
      row.ingredients.push({
        id: i.id,
        name: i.name,
        currentStock: stock,
        costPerUnit: i.costPerUnit != null ? Number(i.costPerUnit) : null,
      });
      row.totalValue += stock * cost;
    }

    const list = [...bySupplier.values()].map((s) => ({
      supplierId: s.supplierId,
      ingredientsCount: s.ingredients.length,
      ingredients: s.ingredients,
      totalValue: Math.round(s.totalValue * 100) / 100,
    }));

    return NextResponse.json(list);
  } catch (e: unknown) {
    console.error('[purchases suppliers GET]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unauthorized' },
      { status: 401 }
    );
  }
}
