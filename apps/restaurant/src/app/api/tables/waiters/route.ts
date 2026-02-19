import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRestaurantSessionFromRequest } from '@/lib/session';

const WAITER_ROLES = ['WAITER', 'BARTENDER', 'MANAGER', 'RESTAURANT_OWNER'];

export async function GET(req: NextRequest) {
  try {
    const session = await requireRestaurantSessionFromRequest(req);
    const employees = await prisma.restaurantEmployee.findMany({
      where: {
        restaurantId: session.restaurantId,
        isActive: true,
        role: { in: WAITER_ROLES },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
      },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    });
    return NextResponse.json(
      employees.map((e) => ({
        id: e.id,
        name: `${e.firstName} ${e.lastName}`.trim() || e.id,
        role: e.role,
      }))
    );
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
