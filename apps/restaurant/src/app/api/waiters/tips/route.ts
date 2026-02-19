import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRestaurantSessionFromRequest } from '@/lib/session';

/** GET /api/waiters/tips — list tips, filter: employeeId?, dateFrom?, dateTo? */
export async function GET(req: NextRequest) {
  try {
    const session = await requireRestaurantSessionFromRequest(req);
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId') || undefined;
    const dateFrom = searchParams.get('dateFrom') || undefined;
    const dateTo = searchParams.get('dateTo') || undefined;

    const where: { restaurantId: string; employeeId?: string; createdAt?: { gte?: Date; lte?: Date } } = {
      restaurantId: session.restaurantId,
    };
    if (employeeId) where.employeeId = employeeId;
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) {
        const d = new Date(dateTo);
        d.setHours(23, 59, 59, 999);
        where.createdAt.lte = d;
      }
    }

    const tips = await prisma.tip.findMany({
      where,
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true },
        },
        order: { select: { id: true, orderNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    return NextResponse.json(
      tips.map((t) => ({
        id: t.id,
        orderId: t.orderId,
        employeeId: t.employeeId,
        amount: Number(t.amount),
        isPool: t.isPool,
        createdAt: t.createdAt.toISOString(),
        employee: t.employee
          ? { id: t.employee.id, name: `${t.employee.firstName} ${t.employee.lastName}`.trim() }
          : null,
        orderNumber: t.order?.orderNumber,
      }))
    );
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unauthorized' },
      { status: 401 }
    );
  }
}
