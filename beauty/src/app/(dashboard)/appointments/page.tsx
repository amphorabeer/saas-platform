import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { AppointmentsClient } from './AppointmentsClient';

async function getAppointmentsData(salonId: string) {
  const [staff, services, clients] = await Promise.all([
    prisma.staff.findMany({
      where: { salonId, isActive: true, role: { in: ['OWNER', 'SPECIALIST'] } },
      select: { id: true, name: true, specialties: true },
      orderBy: { name: 'asc' },
    }),
    prisma.service.findMany({
      where: { salonId, isActive: true },
      include: { category: true },
      orderBy: { sortOrder: 'asc' },
    }),
    prisma.client.findMany({
      where: { salonId, isActive: true },
      select: { id: true, name: true, phone: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  return {
    staff: staff.map((s) => ({ id: s.id, name: s.name, specialties: s.specialties })),
    services: services.map((s) => ({
      id: s.id, name: s.name, duration: s.duration, price: s.price,
      categoryName: s.category?.name || null,
    })),
    clients: clients.map((c) => ({ id: c.id, name: c.name, phone: c.phone })),
  };
}

export default async function AppointmentsPage() {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const data = await getAppointmentsData(session.user.salonId);

  return <AppointmentsClient data={data} />;
}
