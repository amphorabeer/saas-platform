import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRestaurantSessionFromRequest } from '@/lib/session';

/** GET /api/ingredients — list ingredients (id, name, unit, currentStock) for dropdowns */
export async function GET(req: NextRequest) {
  try {
    const session = await requireRestaurantSessionFromRequest(req);

    const ingredients = await prisma.ingredient.findMany({
      where: { restaurantId: session.restaurantId, isActive: true },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        unit: true,
        currentStock: true,
      },
    });

    const list = ingredients.map((i) => ({
      id: i.id,
      name: i.name,
      unit: i.unit,
      currentStock: Number(i.currentStock),
    }));

    return NextResponse.json(list);
  } catch (e: unknown) {
    console.error('[api/ingredients GET]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unauthorized' },
      { status: 401 }
    );
  }
}
