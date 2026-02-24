import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { BookingAdmin } from './BookingAdmin';

export default async function BookingPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/auth/login');

  const salon = await prisma.salon.findUnique({
    where: { id: session.user.salonId },
    select: { slug: true, name: true },
  });

  const pendingAppointments = await prisma.appointment.findMany({
    where: {
      salonId: session.user.salonId,
      source: 'ONLINE',
      status: 'SCHEDULED',
    },
    include: {
      client: true,
      staff: true,
      services: { include: { service: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <BookingAdmin
      slug={salon?.slug || ''}
      salonName={salon?.name || ''}
      pending={pendingAppointments.map((a) => ({
        id: a.id,
        clientName: a.client?.name || 'უცნობი',
        clientPhone: a.client?.phone || '',
        staffName: a.staff.name,
        date: a.date.toISOString().slice(0, 10),
        startTime: a.startTime,
        endTime: a.endTime,
        services: a.services.map((s) => s.service.name),
        notes: a.notes,
        createdAt: a.createdAt.toISOString(),
      }))}
    />
  );
}
