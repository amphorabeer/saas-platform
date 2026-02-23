import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ClientsClient } from './ClientsClient';

async function getClientsData(salonId: string) {
  const clients = await prisma.client.findMany({
    where: { salonId },
    include: {
      _count: {
        select: { appointments: true, sales: true, reviews: true },
      },
      loyaltyTransactions: {
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
      giftCards: {
        where: { isActive: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return clients.map((c) => ({
    id: c.id,
    name: c.name,
    phone: c.phone,
    email: c.email,
    birthDate: c.birthDate?.toISOString() || null,
    gender: c.gender,
    notes: c.notes,
    allergies: c.allergies,
    hairType: c.hairType,
    colorFormula: c.colorFormula,
    loyaltyPoints: c.loyaltyPoints,
    loyaltyTier: c.loyaltyTier,
    isActive: c.isActive,
    createdAt: c.createdAt.toISOString(),
    appointmentsCount: c._count.appointments,
    salesCount: c._count.sales,
    reviewsCount: c._count.reviews,
    loyaltyTransactions: c.loyaltyTransactions.map((t) => ({
      id: t.id,
      points: t.points,
      type: t.type,
      description: t.description,
      createdAt: t.createdAt.toISOString(),
    })),
    giftCards: c.giftCards.map((g) => ({
      id: g.id,
      code: g.code,
      balance: g.balance,
      expiresAt: g.expiresAt?.toISOString() || null,
    })),
  }));
}

export default async function ClientsPage() {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const clients = await getClientsData(session.user.salonId);

  return <ClientsClient clients={clients} />;
}
