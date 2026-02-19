import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRestaurantSessionFromRequest } from '@/lib/session';

/** GET ?from=YYYY-MM-DD&to=YYYY-MM-DD — P&L aggregation */
export async function GET(req: NextRequest) {
  try {
    const session = await requireRestaurantSessionFromRequest(req);
    const { searchParams } = new URL(req.url);
    const fromStr = searchParams.get('from');
    const toStr = searchParams.get('to');

    const from = fromStr ? new Date(fromStr) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const to = toStr ? new Date(toStr) : new Date();
    to.setHours(23, 59, 59, 999);

    const [orders, invoices, expenses, purchases] = await Promise.all([
      prisma.restaurantOrder.findMany({
        where: {
          restaurantId: session.restaurantId,
          status: 'PAID',
          paidAt: { gte: from, lte: to },
        },
        select: { totalAmount: true, paidAt: true },
      }),
      prisma.restaurantInvoice.findMany({
        where: {
          restaurantId: session.restaurantId,
          status: { in: ['PAID', 'PARTIAL'] },
          issueDate: { gte: from, lte: to },
        },
        select: { paidAmount: true, issueDate: true },
      }),
      prisma.expense.findMany({
        where: {
          restaurantId: session.restaurantId,
          date: { gte: from, lte: to },
        },
        select: { amount: true, date: true, categoryId: true, category: { select: { id: true, name: true, icon: true, color: true } } },
      }),
      prisma.purchaseInvoice.findMany({
        where: {
          restaurantId: session.restaurantId,
          issueDate: { gte: from, lte: to },
        },
        select: { totalAmount: true, issueDate: true },
      }),
    ]);

    const posTotal = orders.reduce((s, o) => s + Number(o.totalAmount), 0);
    const invoiceTotal = invoices.reduce((s, i) => s + Number(i.paidAmount), 0);
    const totalRevenue = posTotal + invoiceTotal;

    const byCategory = new Map<string, { name: string; icon: string | null; color: string | null; amount: number }>();
    for (const e of expenses) {
      const cat = e.category;
      const key = cat.id;
      if (!byCategory.has(key)) {
        byCategory.set(key, { name: cat.name, icon: cat.icon, color: cat.color, amount: 0 });
      }
      byCategory.get(key)!.amount += Number(e.amount);
    }
    const expenseCategories = Array.from(byCategory.entries()).map(([id, v]) => ({ id, ...v }));

    const purchaseTotal = purchases.reduce((s, p) => s + Number(p.totalAmount), 0);
    const totalExpenses = expenseCategories.reduce((s, c) => s + c.amount, 0) + purchaseTotal;
    const netProfit = totalRevenue - totalExpenses;
    const marginPercent = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    const daysDiff = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
    const useDaily = daysDiff <= 31;

    const dailyRevenueMap = new Map<string, number>();
    const dailyExpenseMap = new Map<string, number>();

    for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().slice(0, 10);
      dailyRevenueMap.set(key, 0);
      dailyExpenseMap.set(key, 0);
    }

    orders.forEach((o) => {
      if (!o.paidAt) return;
      const key = new Date(o.paidAt).toISOString().slice(0, 10);
      dailyRevenueMap.set(key, (dailyRevenueMap.get(key) ?? 0) + Number(o.totalAmount));
    });
    invoices.forEach((i) => {
      const key = new Date(i.issueDate).toISOString().slice(0, 10);
      dailyRevenueMap.set(key, (dailyRevenueMap.get(key) ?? 0) + Number(i.paidAmount));
    });

    expenses.forEach((e) => {
      const key = new Date(e.date).toISOString().slice(0, 10);
      dailyExpenseMap.set(key, (dailyExpenseMap.get(key) ?? 0) + Number(e.amount));
    });
    purchases.forEach((p) => {
      const key = new Date(p.issueDate).toISOString().slice(0, 10);
      dailyExpenseMap.set(key, (dailyExpenseMap.get(key) ?? 0) + Number(p.totalAmount));
    });

    let chartData: Array<{ period: string; revenue: number; expenses: number; displayLabel: string }>;

    if (useDaily) {
      chartData = Array.from(dailyRevenueMap.entries())
        .map(([date]) => ({
          period: date,
          displayLabel: new Date(date).toLocaleDateString('ka-GE', { month: 'short', day: 'numeric' }),
          revenue: dailyRevenueMap.get(date) ?? 0,
          expenses: dailyExpenseMap.get(date) ?? 0,
        }))
        .sort((a, b) => a.period.localeCompare(b.period));
    } else {
      const monthMap = new Map<string, { revenue: number; expenses: number }>();
      dailyRevenueMap.forEach((rev, date) => {
        const monthKey = date.slice(0, 7);
        if (!monthMap.has(monthKey)) monthMap.set(monthKey, { revenue: 0, expenses: 0 });
        const row = monthMap.get(monthKey)!;
        row.revenue += rev;
        row.expenses += dailyExpenseMap.get(date) ?? 0;
      });
      chartData = Array.from(monthMap.entries())
        .map(([period, v]) => ({
          period,
          displayLabel: new Date(period + '-01').toLocaleDateString('ka-GE', { month: 'short', year: 'numeric' }),
          revenue: v.revenue,
          expenses: v.expenses,
        }))
        .sort((a, b) => a.period.localeCompare(b.period));
    }

    const expenseBreakdown = expenseCategories.map((c) => ({
      name: c.name,
      amount: c.amount,
      color: c.color || '#64748b',
      percent: totalExpenses > 0 ? (c.amount / totalExpenses) * 100 : 0,
    }));
    if (purchaseTotal > 0) {
      expenseBreakdown.push({
        name: 'შესყიდვები',
        amount: purchaseTotal,
        color: '#f97316',
        percent: totalExpenses > 0 ? (purchaseTotal / totalExpenses) * 100 : 0,
      });
    }

    return NextResponse.json({
      period: { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) },
      revenue: {
        posSales: posTotal,
        invoiceRevenue: invoiceTotal,
        total: totalRevenue,
      },
      expenses: {
        categories: expenseCategories,
        purchaseTotal,
        total: totalExpenses,
      },
      netProfit,
      marginPercent,
      chartData,
      expenseBreakdown,
    });
  } catch (e: unknown) {
    console.error('[finance pnl GET]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unauthorized' },
      { status: 401 }
    );
  }
}
