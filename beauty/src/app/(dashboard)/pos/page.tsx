import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { POSClient } from './POSClient';

export default async function POSPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/auth/login');

  const [services, staff, clients, categories, products, recentSales] = await Promise.all([
    prisma.service.findMany({
      where: { salonId: session.user.salonId, isActive: true },
      include: { category: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    }),
    prisma.staff.findMany({
      where: { salonId: session.user.salonId, isActive: true },
      orderBy: { name: 'asc' },
    }),
    prisma.client.findMany({
      where: { salonId: session.user.salonId, isActive: true },
      orderBy: { name: 'asc' },
    }),
    prisma.serviceCategory.findMany({
      where: { salonId: session.user.salonId, isActive: true },
      orderBy: { sortOrder: 'asc' },
    }),
    prisma.product.findMany({
      where: { salonId: session.user.salonId, isActive: true, stock: { gt: 0 } },
      orderBy: { name: 'asc' },
    }),
    prisma.sale.findMany({
      where: { salonId: session.user.salonId },
      include: {
        items: { include: { service: true, product: true } },
        client: true,
        staff: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
  ]);

  const data = {
    services: services.map((s) => ({
      id: s.id,
      name: s.name,
      price: s.price,
      duration: s.duration,
      categoryId: s.categoryId,
      categoryName: s.category?.name || null,
    })),
    staff: staff.map((s) => ({
      id: s.id,
      name: s.name,
      role: s.role,
    })),
    clients: clients.map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      loyaltyPoints: c.loyaltyPoints,
      loyaltyTier: c.loyaltyTier,
    })),
    categories: categories.map((c) => ({
      id: c.id,
      name: c.name,
      color: c.color,
    })),
    products: products.map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      stock: p.stock,
      category: p.category,
      brand: p.brand,
    })),
    recentSales: recentSales.map((s) => ({
      id: s.id,
      total: s.total,
      subtotal: s.subtotal,
      discount: s.discount,
      paymentMethod: s.paymentMethod,
      paymentStatus: s.paymentStatus,
      receiptNumber: s.receiptNumber,
      createdAt: s.createdAt.toISOString(),
      clientName: s.client?.name || null,
      staffName: s.staff?.name || null,
      items: s.items.map((i) => ({
        name: i.name,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        total: i.total,
      })),
    })),
  };

  return <POSClient data={data} />;
}
