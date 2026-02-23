import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { DashboardClient } from './DashboardClient';

async function getDashboardData(salonId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const [
    todayAppointments,
    totalClients,
    activeStaff,
    totalServices,
    monthlyRevenue,
    todayRevenue,
    recentSales,
    upcomingAppointments,
  ] = await Promise.all([
    prisma.appointment.count({
      where: { salonId, date: { gte: today, lt: tomorrow } },
    }),
    prisma.client.count({ where: { salonId, isActive: true } }),
    prisma.staff.count({ where: { salonId, isActive: true } }),
    prisma.service.count({ where: { salonId, isActive: true } }),
    prisma.sale.aggregate({
      where: {
        salonId,
        createdAt: { gte: startOfMonth },
        paymentStatus: 'COMPLETED',
      },
      _sum: { total: true },
    }),
    prisma.sale.aggregate({
      where: {
        salonId,
        createdAt: { gte: today, lt: tomorrow },
        paymentStatus: 'COMPLETED',
      },
      _sum: { total: true },
    }),
    prisma.sale.findMany({
      where: { salonId, paymentStatus: 'COMPLETED' },
      include: { client: true, staff: true },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    prisma.appointment.findMany({
      where: {
        salonId,
        date: { gte: today },
        status: { in: ['SCHEDULED', 'CONFIRMED'] },
      },
      include: { client: true, staff: true, services: { include: { service: true } } },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
      take: 8,
    }),
  ]);

  return {
    kpis: {
      todayAppointments,
      totalClients,
      activeStaff,
      totalServices,
      monthlyRevenue: monthlyRevenue._sum.total || 0,
      todayRevenue: todayRevenue._sum.total || 0,
    },
    recentSales: recentSales.map((s) => ({
      id: s.id,
      total: s.total,
      clientName: s.client?.name || 'ანონიმური',
      staffName: s.staff?.name || '-',
      paymentMethod: s.paymentMethod,
      createdAt: s.createdAt.toISOString(),
    })),
    upcomingAppointments: upcomingAppointments.map((a) => ({
      id: a.id,
      date: a.date.toISOString(),
      startTime: a.startTime,
      endTime: a.endTime,
      status: a.status,
      clientName: a.client?.name || 'ანონიმური',
      staffName: a.staff.name,
      services: a.services.map((s) => s.service.name),
    })),
  };
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const data = await getDashboardData(session.user.salonId);

  return <DashboardClient data={data} userName={session.user.name} />;
}
