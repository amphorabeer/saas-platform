import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRestaurantSessionFromRequest } from '@/lib/session';

/** GET /api/reports/z-report — Z-report for date */
export async function GET(req: NextRequest) {
  try {
    const session = await requireRestaurantSessionFromRequest(req);
    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get('date') || new Date().toISOString().slice(0, 10);
    const date = new Date(dateStr);
    date.setHours(0, 0, 0, 0);
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);

    const where = {
      restaurantId: session.restaurantId,
      createdAt: { gte: date, lt: nextDay },
    };

    const orders = await prisma.restaurantOrder.findMany({
      where,
      include: { splitPayments: true },
      orderBy: { createdAt: 'asc' },
    });

    const paidOrders = orders.filter((o) => o.status === 'PAID');
    const cancelledOrders = orders.filter((o) => o.status === 'CANCELLED');

    const firstOrder = paidOrders[0];
    const lastOrder = paidOrders[paidOrders.length - 1];

    const totalSales = paidOrders.reduce((s, o) => s + Number(o.totalAmount), 0);
    const tipsTotal = paidOrders.reduce((s, o) => s + Number(o.tipAmount), 0);
    const discountsTotal = paidOrders.reduce((s, o) => s + Number(o.discountAmount), 0);
    const cancelledCount = cancelledOrders.length;
    const cancelledAmount = cancelledOrders.reduce((s, o) => s + Number(o.totalAmount), 0);
    const netSales = totalSales - discountsTotal - cancelledAmount;

    let cashTotal = 0;
    let cardTotal = 0;
    let splitTotal = 0;
    for (const o of paidOrders) {
      if (o.splitPayments.length > 0) {
        for (const sp of o.splitPayments) {
          const amt = Number(sp.amount);
          const method = (sp.paymentMethod || '').toUpperCase();
          if (method.includes('CASH') || method === 'ნაღდი') cashTotal += amt;
          else if (method.includes('CARD') || method.includes('ბარათ')) cardTotal += amt;
          else splitTotal += amt;
        }
      } else {
        const method = (o.paymentMethod || 'CASH').toUpperCase();
        const amt = Number(o.totalAmount);
        if (method.includes('CARD') || method.includes('ბარათ')) cardTotal += amt;
        else cashTotal += amt;
      }
    }

    return NextResponse.json({
      date: dateStr,
      firstOrderTime: firstOrder ? firstOrder.createdAt.toISOString() : null,
      lastOrderTime: lastOrder ? lastOrder.createdAt.toISOString() : null,
      totalOrders: paidOrders.length,
      totalSales,
      cashTotal,
      cardTotal,
      splitTotal,
      tipsTotal,
      discountsTotal,
      cancelledCount,
      cancelledAmount,
      netSales,
    });
  } catch (e: unknown) {
    console.error('[z-report GET]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unauthorized' },
      { status: 401 }
    );
  }
}
