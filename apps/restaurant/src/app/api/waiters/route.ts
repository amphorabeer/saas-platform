import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRestaurantSessionFromRequest } from '@/lib/session';

const ROLES = ['RESTAURANT_OWNER', 'MANAGER', 'WAITER', 'BARTENDER', 'CHEF', 'HOST', 'CASHIER'] as const;

/** GET /api/waiters — list employees, filter: role?, isActive?, search? */
export async function GET(req: NextRequest) {
  try {
    const session = await requireRestaurantSessionFromRequest(req);
    const { searchParams } = new URL(req.url);
    const role = searchParams.get('role') || undefined;
    const isActive = searchParams.get('isActive');
    const search = searchParams.get('search')?.trim() || undefined;

    const where: { restaurantId: string; role?: string; isActive?: boolean; OR?: unknown[] } = {
      restaurantId: session.restaurantId,
    };
    if (role && ROLES.includes(role as (typeof ROLES)[number])) where.role = role;
    if (isActive === 'true') where.isActive = true;
    if (isActive === 'false') where.isActive = false;
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [employees, activeAssignments, tipsCounts] = await Promise.all([
      prisma.restaurantEmployee.findMany({
        where,
        orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
      }),
      prisma.waiterAssignment.findMany({
        where: { restaurantId: session.restaurantId, isActive: true },
        select: { employeeId: true },
      }),
      prisma.tip.groupBy({
        by: ['employeeId'],
        where: { restaurantId: session.restaurantId, employeeId: { not: null } },
        _count: { id: true },
      }),
    ]);
    const assignmentCountByEmployee = new Map<string, number>();
    for (const a of activeAssignments) {
      assignmentCountByEmployee.set(a.employeeId, (assignmentCountByEmployee.get(a.employeeId) ?? 0) + 1);
    }
    const tipsCountByEmployee = new Map(tipsCounts.map((t) => [t.employeeId!, t._count.id]));

    return NextResponse.json(
      employees.map((e) => ({
        id: e.id,
        restaurantId: e.restaurantId,
        userId: e.userId,
        firstName: e.firstName,
        lastName: e.lastName,
        phone: e.phone,
        email: e.email,
        role: e.role,
        pin: e.pin ? '••••••' : null,
        isActive: e.isActive,
        photoUrl: e.photoUrl,
        createdAt: e.createdAt.toISOString(),
        updatedAt: e.updatedAt.toISOString(),
        assignmentsCount: assignmentCountByEmployee.get(e.id) ?? 0,
        tipsCount: tipsCountByEmployee.get(e.id) ?? 0,
      }))
    );
  } catch (e: unknown) {
    console.error('[waiters GET]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unauthorized' },
      { status: 401 }
    );
  }
}

/** POST /api/waiters — create employee, PIN unique per restaurant */
export async function POST(req: Request) {
  try {
    const session = await requireRestaurantSessionFromRequest(req);
    const body = await req.json();
    const { firstName, lastName, role, pin, phone, email, photoUrl, isActive } = body;

    if (!firstName?.trim() || !lastName?.trim()) {
      return NextResponse.json(
        { error: 'სახელი და გვარი აუცილებელია' },
        { status: 400 }
      );
    }

    const pinStr = pin != null ? String(pin).replace(/\D/g, '').slice(0, 6) : null;
    if (pinStr && pinStr.length === 6) {
      const existing = await prisma.restaurantEmployee.findFirst({
        where: { restaurantId: session.restaurantId, pin: pinStr },
      });
      if (existing) {
        return NextResponse.json(
          { error: 'ამ PIN-ით უკვე რეგისტრირებულია სხვა თანამშრომელი' },
          { status: 400 }
        );
      }
    }

    const roleVal = role && ROLES.includes(role) ? role : 'WAITER';
    const employee = await prisma.restaurantEmployee.create({
      data: {
        restaurantId: session.restaurantId,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        role: roleVal,
        pin: pinStr || null,
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        photoUrl: photoUrl?.trim() || null,
        isActive: isActive !== false,
      },
    });

    return NextResponse.json({
      ...employee,
      pin: employee.pin ? '••••••' : null,
    });
  } catch (e: unknown) {
    console.error('[waiters POST]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 }
    );
  }
}
