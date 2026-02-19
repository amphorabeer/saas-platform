import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRestaurantSessionFromRequest } from '@/lib/session';

/** POST /api/waiters/generate-pin — returns random 6-digit PIN unique in restaurant (for new employee) */
export async function POST(req: NextRequest) {
  try {
    const session = await requireRestaurantSessionFromRequest(req);

    const used = await prisma.restaurantEmployee.findMany({
      where: { restaurantId: session.restaurantId, pin: { not: null } },
      select: { pin: true },
    });
    const usedSet = new Set(used.map((e) => e.pin).filter(Boolean));

    let pin: string;
    do {
      pin = Math.floor(100000 + Math.random() * 900000).toString();
    } while (usedSet.has(pin));

    return NextResponse.json({ pin });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unauthorized' },
      { status: 401 }
    );
  }
}
