import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRestaurantSessionFromRequest } from '@/lib/session';

/** GET /api/suppliers — list suppliers for restaurant */
export async function GET(req: NextRequest) {
  try {
    const session = await requireRestaurantSessionFromRequest(req);

    const suppliers = await prisma.supplier.findMany({
      where: { restaurantId: session.restaurantId },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        taxId: true,
        contact: true,
        email: true,
        address: true,
      },
    });

    return NextResponse.json(suppliers);
  } catch (e: unknown) {
    console.error('[api/suppliers GET]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unauthorized' },
      { status: 401 }
    );
  }
}
