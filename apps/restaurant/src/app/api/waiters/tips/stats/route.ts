import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRestaurantSessionFromRequest } from '@/lib/session';

/** GET /api/waiters/tips/stats — aggregated per employee. Query: dateFrom, dateTo */
export async function GET(req: NextRequest) {
  try {
    const session = await requireRestaurantSessionFromRequest(req);
    const { searchParams } = new URL(req.url);
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    const where: { restaurantId: string; isPool: boolean; createdAt?: { gte?: Date; lte?: Date } } = {
      restaurantId: session.restaurantId,
      isPool: false,
    };
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
      select: {
        employeeId: true,
        amount: true,
        orderId: true,
        createdAt: true,
        employee: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    const byEmployee = new Map<
      string,
      { employeeId: string; name: string; orders: Set<string>; total: number; amounts: number[] }
    >();
    for (const t of tips) {
      if (!t.employeeId || !t.employee) continue;
      const key = t.employeeId;
      if (!byEmployee.has(key)) {
        byEmployee.set(key, {
          employeeId: key,
          name: `${t.employee.firstName} ${t.employee.lastName}`.trim(),
          orders: new Set(),
          total: 0,
          amounts: [],
        });
      }
      const row = byEmployee.get(key)!;
      row.orders.add(t.orderId);
      row.total += Number(t.amount);
      row.amounts.push(Number(t.amount));
    }

    const stats = [...byEmployee.values()].map((row) => ({
      employeeId: row.employeeId,
      employeeName: row.name,
      ordersCount: row.orders.size,
      tipsTotal: Math.round(row.total * 100) / 100,
      tipsAvg: row.amounts.length ? Math.round((row.total / row.amounts.length) * 100) / 100 : 0,
      tipsMax: row.amounts.length ? Math.max(...row.amounts) : 0,
    }));

    const poolWhere: { restaurantId: string; isPool: boolean; createdAt?: { gte?: Date; lte?: Date } } = {
      restaurantId: session.restaurantId,
      isPool: true,
    };
    if (dateFrom || dateTo) {
      poolWhere.createdAt = {};
      if (dateFrom) poolWhere.createdAt.gte = new Date(dateFrom);
      if (dateTo) {
        const d = new Date(dateTo);
        d.setHours(23, 59, 59, 999);
        poolWhere.createdAt.lte = d;
      }
    }
    const poolTotal = await prisma.tip.aggregate({
      where: poolWhere,
      _sum: { amount: true },
    });

    return NextResponse.json({
      byEmployee: stats,
      poolTotal: Number(poolTotal._sum.amount ?? 0),
    });
  } catch (e: unknown) {
    console.error('[waiters tips stats]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unauthorized' },
      { status: 401 }
    );
  }
}
