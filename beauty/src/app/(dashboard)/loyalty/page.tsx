import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { LoyaltyClient } from './LoyaltyClient';

export default async function LoyaltyPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/auth/login');

  const salonId = session.user.salonId;

  const [clients, transactions, giftCards] = await Promise.all([
    prisma.client.findMany({
      where: { salonId, isActive: true },
      orderBy: { loyaltyPoints: 'desc' },
      select: {
        id: true,
        name: true,
        phone: true,
        loyaltyPoints: true,
        loyaltyTier: true,
        _count: { select: { sales: true } },
      },
    }),
    prisma.loyaltyTransaction.findMany({
      where: { client: { salonId } },
      include: { client: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.giftCard.findMany({
      where: { salonId },
      include: { client: true },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const data = {
    clients: clients.map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      loyaltyPoints: c.loyaltyPoints,
      loyaltyTier: c.loyaltyTier,
      salesCount: c._count.sales,
    })),
    transactions: transactions.map((t) => ({
      id: t.id,
      clientName: t.client.name,
      clientId: t.clientId,
      points: t.points,
      type: t.type,
      description: t.description,
      createdAt: t.createdAt.toISOString(),
    })),
    giftCards: giftCards.map((g) => ({
      id: g.id,
      code: g.code,
      initialBalance: g.initialBalance,
      balance: g.balance,
      expiresAt: g.expiresAt?.toISOString() || null,
      isActive: g.isActive,
      clientName: g.client?.name || null,
      createdAt: g.createdAt.toISOString(),
    })),
  };

  return <LoyaltyClient data={data} />;
}
