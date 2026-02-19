import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRestaurantSessionFromRequest } from '@/lib/session';

/** POST /api/pos/verify-pin — verify waiter PIN for restaurant. Body: { pin }. Returns employee. */
export async function POST(req: NextRequest) {
  try {
    const session = await requireRestaurantSessionFromRequest(req);
    const body = await req.json();
    const pin = String(body.pin ?? '').replace(/\D/g, '').trim();

    if (!pin) {
      return NextResponse.json({ error: 'PIN აუცილებელია' }, { status: 400 });
    }

    const employee = await prisma.restaurantEmployee.findFirst({
      where: {
        restaurantId: session.restaurantId,
        pin,
        isActive: true,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
      },
    });

    if (!employee) {
      return NextResponse.json({ error: 'არასწორი PIN' }, { status: 401 });
    }

    return NextResponse.json({
      employeeId: employee.id,
      firstName: employee.firstName,
      lastName: employee.lastName,
      role: employee.role,
    });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unauthorized' },
      { status: 401 }
    );
  }
}
