import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/finance — list expenses + revenue summary
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const salonId = session.user.salonId;
    const { searchParams } = new URL(req.url);
    const month = searchParams.get('month'); // YYYY-MM format

    let startDate: Date;
    let endDate: Date;

    if (month) {
      const [y, m] = month.split('-').map(Number);
      startDate = new Date(y, m - 1, 1);
      endDate = new Date(y, m, 0, 23, 59, 59);
    } else {
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    }

    const [expenses, sales, staffMembers] = await Promise.all([
      prisma.expense.findMany({
        where: {
          salonId,
          date: { gte: startDate, lte: endDate },
        },
        orderBy: { date: 'desc' },
      }),
      prisma.sale.findMany({
        where: {
          salonId,
          createdAt: { gte: startDate, lte: endDate },
          paymentStatus: 'COMPLETED',
        },
        include: {
          items: { include: { service: true, product: true } },
          staff: true,
          client: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.staff.findMany({
        where: { salonId, isActive: true },
        select: { id: true, name: true, commissionType: true, commissionRate: true },
      }),
    ]);

    const totalRevenue = sales.reduce((s, sale) => s + sale.total, 0);
    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);

    // Revenue by payment method
    const revenueByMethod: Record<string, number> = {};
    sales.forEach((s) => {
      revenueByMethod[s.paymentMethod] = (revenueByMethod[s.paymentMethod] || 0) + s.total;
    });

    // Expenses by category
    const expensesByCategory: Record<string, number> = {};
    expenses.forEach((e) => {
      expensesByCategory[e.category] = (expensesByCategory[e.category] || 0) + e.amount;
    });

    // Staff commissions
    const staffRevenueMap: Record<string, number> = {};
    sales.forEach((s) => {
      if (s.staffId) {
        staffRevenueMap[s.staffId] = (staffRevenueMap[s.staffId] || 0) + s.total;
      }
    });

    const staffCommissions = staffMembers.map((staff) => {
      const revenue = staffRevenueMap[staff.id] || 0;
      const salesCount = sales.filter((s) => s.staffId === staff.id).length;
      let commission = 0;
      if (staff.commissionType === 'PERCENTAGE' && staff.commissionRate > 0) {
        commission = (revenue * staff.commissionRate) / 100;
      } else if (staff.commissionType === 'FIXED' && staff.commissionRate > 0) {
        commission = staff.commissionRate * salesCount;
      }
      return {
        id: staff.id,
        name: staff.name,
        commissionType: staff.commissionType,
        commissionRate: staff.commissionRate,
        revenue,
        salesCount,
        commission,
      };
    }).sort((a, b) => b.revenue - a.revenue);

    const totalCommissions = staffCommissions.reduce((s, sc) => s + sc.commission, 0);

    return NextResponse.json({
      expenses: expenses.map((e) => ({
        id: e.id,
        category: e.category,
        amount: e.amount,
        date: e.date.toISOString(),
        description: e.description,
        createdAt: e.createdAt.toISOString(),
      })),
      sales: sales.map((s) => ({
        id: s.id,
        total: s.total,
        subtotal: s.subtotal,
        discount: s.discount,
        paymentMethod: s.paymentMethod,
        receiptNumber: s.receiptNumber,
        createdAt: s.createdAt.toISOString(),
        staffName: s.staff?.name || null,
        clientName: s.client?.name || null,
        items: s.items.map((i) => ({
          name: i.name,
          type: i.type,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          total: i.total,
        })),
      })),
      staffCommissions,
      summary: {
        totalRevenue,
        totalExpenses,
        totalCommissions,
        netProfit: totalRevenue - totalExpenses - totalCommissions,
        salesCount: sales.length,
        revenueByMethod,
        expensesByCategory,
      },
    });
  } catch (error: any) {
    console.error('GET /api/finance error:', error?.message || error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

// POST /api/finance — create expense
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    if (!['OWNER', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ message: 'არ გაქვთ უფლება' }, { status: 403 });
    }

    const body = await req.json();

    if (!body.category) {
      return NextResponse.json({ message: 'კატეგორია სავალდებულოა' }, { status: 400 });
    }
    if (!body.amount || body.amount <= 0) {
      return NextResponse.json({ message: 'თანხა სავალდებულოა' }, { status: 400 });
    }

    const expense = await prisma.expense.create({
      data: {
        salonId: session.user.salonId,
        category: body.category,
        amount: Number(body.amount),
        date: body.date ? new Date(body.date) : new Date(),
        description: body.description || null,
      },
    });

    return NextResponse.json(expense, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/finance error:', error?.message || error);
    return NextResponse.json({ message: 'Server error', detail: error?.message }, { status: 500 });
  }
}
