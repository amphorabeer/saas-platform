import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { StaffListClient } from './StaffListClient';

async function getStaffData(salonId: string) {
  const staff = await prisma.staff.findMany({
    where: { salonId },
    include: {
      schedules: true,
      staffServices: {
        include: { service: true },
      },
      _count: {
        select: {
          appointments: true,
          reviews: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  return staff.map((s) => ({
    id: s.id,
    name: s.name,
    email: s.email,
    phone: s.phone,
    avatar: s.avatar,
    role: s.role,
    specialties: s.specialties,
    bio: s.bio,
    pin: s.pin,
    commissionType: s.commissionType,
    commissionRate: s.commissionRate,
    isActive: s.isActive,
    createdAt: s.createdAt.toISOString(),
    schedules: s.schedules.map((sc) => ({
      id: sc.id,
      dayOfWeek: sc.dayOfWeek,
      startTime: sc.startTime,
      endTime: sc.endTime,
      isOff: sc.isOff,
    })),
    services: s.staffServices.map((ss) => ({
      id: ss.service.id,
      name: ss.service.name,
    })),
    appointmentsCount: s._count.appointments,
    reviewsCount: s._count.reviews,
  }));
}

export default async function StaffPage() {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const staff = await getStaffData(session.user.salonId);

  return <StaffListClient staff={staff} />;
}
