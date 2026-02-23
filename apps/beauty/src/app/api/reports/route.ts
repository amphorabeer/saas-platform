import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const salonId = session.user.salonId;
    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || 'month';
    const startParam = searchParams.get('start');
    const endParam = searchParams.get('end');
    const staffId = searchParams.get('staffId');

    // Calculate date range
    const now = new Date();
    let startDate: Date;
    let endDate: Date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    if (startParam && endParam) {
      startDate = new Date(startParam);
      endDate = new Date(endParam + 'T23:59:59');
    } else {
      switch (period) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date(now);
          startDate.setDate(now.getDate() - 7);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        case 'month':
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
      }
    }

    const salesWhere: any = {
      salonId,
      createdAt: { gte: startDate, lte: endDate },
      paymentStatus: 'COMPLETED',
    };
    if (staffId) salesWhere.staffId = staffId;

    const appointmentsWhere: any = {
      salonId,
      createdAt: { gte: startDate, lte: endDate },
    };
    if (staffId) appointmentsWhere.staffId = staffId;

    // Fetch all data in parallel
    const [sales, appointments, expenses, clients, staff] = await Promise.all([
      prisma.sale.findMany({
        where: salesWhere,
        include: {
          items: { include: { service: true, product: true } },
          staff: true,
          client: true,
        },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.appointment.findMany({
        where: appointmentsWhere,
        include: { staff: true, services: { include: { service: true } } },
      }),
      prisma.expense.findMany({
        where: {
          salonId,
          date: { gte: startDate },
        },
      }),
      prisma.client.findMany({
        where: {
          salonId,
          createdAt: { gte: startDate },
        },
      }),
      prisma.staff.findMany({
        where: { salonId, isActive: true },
        include: {
          _count: { select: { appointments: true } },
        },
      }),
    ]);

    // Revenue
    const totalRevenue = sales.reduce((sum, s) => sum + s.total, 0);
    const totalDiscount = sales.reduce((sum, s) => sum + s.discount, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const netProfit = totalRevenue - totalExpenses;
    const avgTicket = sales.length > 0 ? totalRevenue / sales.length : 0;

    // Revenue by day
    const revenueByDay: Record<string, number> = {};
    sales.forEach((s) => {
      const day = s.createdAt.toISOString().slice(0, 10);
      revenueByDay[day] = (revenueByDay[day] || 0) + s.total;
    });

    // Revenue by payment method
    const revenueByPayment: Record<string, number> = {};
    sales.forEach((s) => {
      revenueByPayment[s.paymentMethod] = (revenueByPayment[s.paymentMethod] || 0) + s.total;
    });

    // Top services
    const serviceRevenue: Record<string, { name: string; revenue: number; count: number }> = {};
    sales.forEach((s) => {
      s.items.forEach((item) => {
        if (item.type === 'SERVICE' && item.service) {
          const key = item.serviceId || item.name;
          if (!serviceRevenue[key]) {
            serviceRevenue[key] = { name: item.service.name || item.name, revenue: 0, count: 0 };
          }
          serviceRevenue[key].revenue += item.total;
          serviceRevenue[key].count += item.quantity;
        }
      });
    });
    const topServices = Object.values(serviceRevenue)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Top products
    const productRevenue: Record<string, { name: string; revenue: number; count: number }> = {};
    sales.forEach((s) => {
      s.items.forEach((item) => {
        if (item.type === 'PRODUCT') {
          const key = item.productId || item.name;
          if (!productRevenue[key]) {
            productRevenue[key] = { name: item.product?.name || item.name, revenue: 0, count: 0 };
          }
          productRevenue[key].revenue += item.total;
          productRevenue[key].count += item.quantity;
        }
      });
    });
    const topProducts = Object.values(productRevenue)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Staff performance
    const staffRevenue: Record<string, { name: string; revenue: number; salesCount: number }> = {};
    sales.forEach((s) => {
      if (s.staff) {
        if (!staffRevenue[s.staffId!]) {
          staffRevenue[s.staffId!] = { name: s.staff.name, revenue: 0, salesCount: 0 };
        }
        staffRevenue[s.staffId!].revenue += s.total;
        staffRevenue[s.staffId!].salesCount += 1;
      }
    });
    const staffPerformance = Object.values(staffRevenue)
      .sort((a, b) => b.revenue - a.revenue);

    // Appointments stats
    const appointmentsByStatus: Record<string, number> = {};
    appointments.forEach((a) => {
      appointmentsByStatus[a.status] = (appointmentsByStatus[a.status] || 0) + 1;
    });

    // Expenses by category
    const expensesByCategory: Record<string, number> = {};
    expenses.forEach((e) => {
      expensesByCategory[e.category] = (expensesByCategory[e.category] || 0) + e.amount;
    });

    return NextResponse.json({
      period,
      startDate: startDate.toISOString(),
      staffList: staff.map((s) => ({ id: s.id, name: s.name })),
      summary: {
        totalRevenue,
        totalDiscount,
        totalExpenses,
        netProfit,
        avgTicket,
        salesCount: sales.length,
        appointmentsCount: appointments.length,
        newClients: clients.length,
      },
      revenueByDay,
      revenueByPayment,
      topServices,
      topProducts,
      staffPerformance,
      appointmentsByStatus,
      expensesByCategory,
    });
  } catch (error: any) {
    console.error('GET /api/reports error:', error?.message || error);
    return NextResponse.json({ message: 'Server error', detail: error?.message }, { status: 500 });
  }
}
