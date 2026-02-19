import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRestaurantSessionFromRequest } from '@/lib/session';

const ROLES = ['RESTAURANT_OWNER', 'MANAGER', 'WAITER', 'BARTENDER', 'CHEF', 'HOST', 'CASHIER'] as const;

/** GET /api/waiters/[id] — detail + assignment count, tips count */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRestaurantSessionFromRequest(req);
    const { id } = await params;

    const employee = await prisma.restaurantEmployee.findFirst({
      where: { id, restaurantId: session.restaurantId },
      include: {
        _count: {
          select: {
            assignments: { where: { isActive: true } },
            tips: true,
          },
        },
      },
    });
    if (!employee) {
      return NextResponse.json({ error: 'თანამშრომელი ვერ მოიძებნა' }, { status: 404 });
    }

    return NextResponse.json({
      ...employee,
      pin: employee.pin ? '••••••' : null,
      assignmentsCount: employee._count.assignments,
      tipsCount: employee._count.tips,
    });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unauthorized' },
      { status: 401 }
    );
  }
}

/** PUT /api/waiters/[id] — update */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRestaurantSessionFromRequest(req);
    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.restaurantEmployee.findFirst({
      where: { id, restaurantId: session.restaurantId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'თანამშრომელი ვერ მოიძებნა' }, { status: 404 });
    }

    const updates: Record<string, unknown> = {};
    if (body.firstName !== undefined) updates.firstName = String(body.firstName).trim();
    if (body.lastName !== undefined) updates.lastName = String(body.lastName).trim();
    if (body.role !== undefined && ROLES.includes(body.role)) updates.role = body.role;
    if (body.phone !== undefined) updates.phone = body.phone?.trim() || null;
    if (body.email !== undefined) updates.email = body.email?.trim() || null;
    if (body.photoUrl !== undefined) updates.photoUrl = body.photoUrl?.trim() || null;
    if (typeof body.isActive === 'boolean') updates.isActive = body.isActive;
    if (body.pin !== undefined) {
      const pinStr = String(body.pin).replace(/\D/g, '').slice(0, 6);
      if (pinStr.length === 6) {
        const other = await prisma.restaurantEmployee.findFirst({
          where: { restaurantId: session.restaurantId, pin: pinStr, id: { not: id } },
        });
        if (other) {
          return NextResponse.json(
            { error: 'ამ PIN-ით უკვე რეგისტრირებულია სხვა თანამშრომელი' },
            { status: 400 }
          );
        }
        updates.pin = pinStr;
      } else updates.pin = null;
    }

    const updated = await prisma.restaurantEmployee.update({
      where: { id },
      data: updates,
    });
    return NextResponse.json({
      ...updated,
      pin: updated.pin ? '••••••' : null,
    });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 }
    );
  }
}

/** DELETE /api/waiters/[id] */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRestaurantSessionFromRequest(req);
    const { id } = await params;

    const existing = await prisma.restaurantEmployee.findFirst({
      where: { id, restaurantId: session.restaurantId },
      include: {
        _count: {
          select: {
            assignments: { where: { isActive: true } },
            tips: true,
          },
        },
      },
    });
    if (!existing) {
      return NextResponse.json({ error: 'თანამშრომელი ვერ მოიძებნა' }, { status: 404 });
    }

    await prisma.restaurantEmployee.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unauthorized' },
      { status: 401 }
    );
  }
}
