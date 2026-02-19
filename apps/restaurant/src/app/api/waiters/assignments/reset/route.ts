import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRestaurantSessionFromRequest } from '@/lib/session';

/** POST /api/waiters/assignments/reset — unassign all (shift reset) */
export async function POST(req: NextRequest) {
  try {
    const session = await requireRestaurantSessionFromRequest(req);

    await prisma.waiterAssignment.updateMany({
      where: { restaurantId: session.restaurantId, isActive: true },
      data: { isActive: false, unassignedAt: new Date() },
    });
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unauthorized' },
      { status: 401 }
    );
  }
}
