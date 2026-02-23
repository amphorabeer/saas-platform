import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ServicesClient } from './ServicesClient';

async function getServicesData(salonId: string) {
  const [categories, services] = await Promise.all([
    prisma.serviceCategory.findMany({
      where: { salonId },
      orderBy: { sortOrder: 'asc' },
    }),
    prisma.service.findMany({
      where: { salonId },
      include: {
        category: true,
        staffServices: { include: { staff: true } },
      },
      orderBy: { sortOrder: 'asc' },
    }),
  ]);

  return {
    categories: categories.map((c) => ({
      id: c.id,
      name: c.name,
      icon: c.icon,
      color: c.color,
      isActive: c.isActive,
    })),
    services: services.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      duration: s.duration,
      price: s.price,
      priceVariants: s.priceVariants as any,
      categoryId: s.categoryId,
      categoryName: s.category?.name || null,
      image: s.image,
      isActive: s.isActive,
      staffCount: s.staffServices.length,
    })),
  };
}

export default async function ServicesPage() {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const data = await getServicesData(session.user.salonId);

  return <ServicesClient data={data} />;
}
