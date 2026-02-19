import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRestaurantSessionFromRequest } from '@/lib/session';

/** GET ?from=YYYY-MM-DD&to=YYYY-MM-DD — revenue aggregation */
export async function GET(req: NextRequest) {
  try {
    const session = await requireRestaurantSessionFromRequest(req);
    const { searchParams } = new URL(req.url);
    const fromStr = searchParams.get('from');
    const toStr = searchParams.get('to');

    const from = fromStr ? new Date(fromStr) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const to = toStr ? new Date(toStr) : new Date();
    to.setHours(23, 59, 59, 999);

    const [orders, invoices, sentInvoices, overdueInvoices] = await Promise.all([
      prisma.restaurantOrder.findMany({
        where: {
          restaurantId: session.restaurantId,
          status: 'PAID',
          paidAt: { gte: from, lte: to },
        },
        select: { totalAmount: true, paymentMethod: true, paidAt: true },
      }),
      prisma.restaurantInvoice.findMany({
        where: {
          restaurantId: session.restaurantId,
          status: { in: ['PAID', 'PARTIAL'] },
          issueDate: { gte: from, lte: to },
        },
        select: { paidAmount: true, totalAmount: true, issueDate: true },
      }),
      prisma.restaurantInvoice.findMany({
        where: {
          restaurantId: session.restaurantId,
          status: 'SENT',
          dueDate: { gte: new Date() },
        },
        select: { totalAmount: true, paidAmount: true },
      }),
      prisma.restaurantInvoice.findMany({
        where: {
          restaurantId: session.restaurantId,
          status: { in: ['SENT', 'OVERDUE'] },
          dueDate: { lt: new Date() },
        },
        select: { totalAmount: true, paidAmount: true },
      }),
    ]);

    const posTotal = orders.reduce((s, o) => s + Number(o.totalAmount), 0);
    const posCash = orders.filter((o) => (o.paymentMethod ?? '').toUpperCase() === 'CASH').reduce((s, o) => s + Number(o.totalAmount), 0);
    const posCard = orders.filter((o) => (o.paymentMethod ?? '').toUpperCase() === 'CARD').reduce((s, o) => s + Number(o.totalAmount), 0);
    const invoiceRevenueTotal = invoices.reduce((s, i) => s + Number(i.paidAmount), 0);
    const invoicePending = sentInvoices.reduce((s, i) => s + Number(i.totalAmount) - Number(i.paidAmount), 0);
    const invoiceOverdue = overdueInvoices.reduce((s, i) => s + Number(i.totalAmount) - Number(i.paidAmount), 0);
    const totalRevenue = posTotal + invoiceRevenueTotal;

    const dailyMap = new Map<string, { date: string; pos: number; invoices: number }>();
    for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().slice(0, 10);
      dailyMap.set(key, { date: key, pos: 0, invoices: 0 });
    }
    orders.forEach((o) => {
      if (!o.paidAt) return;
      const key = new Date(o.paidAt).toISOString().slice(0, 10);
      const row = dailyMap.get(key);
      if (row) row.pos += Number(o.totalAmount);
    });
    invoices.forEach((i) => {
      const key = new Date(i.issueDate).toISOString().slice(0, 10);
      const row = dailyMap.get(key);
      if (row) row.invoices += Number(i.paidAmount);
    });
    const daily = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      period: { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) },
      posSales: {
        total: posTotal,
        count: orders.length,
        cash: posCash,
        card: posCard,
        avgCheck: orders.length > 0 ? posTotal / orders.length : 0,
      },
      invoiceRevenue: {
        total: invoiceRevenueTotal,
        count: invoices.length,
        pending: invoicePending,
        overdue: invoiceOverdue,
      },
      totalRevenue,
      daily,
    });
  } catch (e: unknown) {
    console.error('[finance revenue GET]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unauthorized' },
      { status: 401 }
    );
  }
}
