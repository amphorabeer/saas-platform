import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRestaurantSessionFromRequest } from '@/lib/session';

/** GET — finance dashboard overview */
export async function GET(req: NextRequest) {
  try {
    const session = await requireRestaurantSessionFromRequest(req);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    monthEnd.setHours(23, 59, 59, 999);

    const [paidOrders, paidInvoices, expenses, overdueInvoices, overduePurchases] = await Promise.all([
      prisma.restaurantOrder.aggregate({
        where: { restaurantId: session.restaurantId, status: 'PAID', paidAt: { gte: monthStart, lte: monthEnd } },
        _sum: { totalAmount: true },
      }),
      prisma.restaurantInvoice.aggregate({
        where: { restaurantId: session.restaurantId, status: 'PAID', paidAt: { gte: monthStart, lte: monthEnd } },
        _sum: { totalAmount: true },
      }),
      prisma.expense.aggregate({
        where: { restaurantId: session.restaurantId, date: { gte: monthStart, lte: monthEnd } },
        _sum: { amount: true },
      }),
      prisma.restaurantInvoice.findMany({
        where: {
          restaurantId: session.restaurantId,
          status: 'SENT',
          dueDate: { lt: now },
        },
        select: { totalAmount: true, paidAmount: true },
      }),
      prisma.purchaseInvoice.findMany({
        where: {
          restaurantId: session.restaurantId,
          status: 'PENDING',
          dueDate: { lt: now },
        },
        select: { totalAmount: true, paidAmount: true },
      }),
    ]);

    const monthRevenue = Number(paidOrders._sum.totalAmount ?? 0) + Number(paidInvoices._sum.totalAmount ?? 0);
    const monthExpenses = Number(expenses._sum.amount ?? 0);
    const monthProfit = monthRevenue - monthExpenses;
    const marginPercent = monthRevenue > 0 ? (monthProfit / monthRevenue) * 100 : 0;

    const overdueInvTotal = overdueInvoices.reduce((s, i) => s + Number(i.totalAmount) - Number(i.paidAmount), 0);
    const overduePurcTotal = overduePurchases.reduce((s, i) => s + Number(i.totalAmount) - Number(i.paidAmount), 0);

    return NextResponse.json({
      monthRevenue,
      monthExpenses,
      monthProfit,
      marginPercent,
      overdueInvoices: { count: overdueInvoices.length, total: overdueInvTotal },
      overduePurchases: { count: overduePurchases.length, total: overduePurcTotal },
    });
  } catch (e: unknown) {
    console.error('[finance dashboard GET]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unauthorized' },
      { status: 401 }
    );
  }
}
