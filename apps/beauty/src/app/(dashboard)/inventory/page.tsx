import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { InventoryClient } from './InventoryClient';

export default async function InventoryPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/auth/login');

  const products = await prisma.product.findMany({
    where: { salonId: session.user.salonId },
    include: {
      _count: { select: { saleItems: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const data = {
    products: products.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      brand: p.brand,
      sku: p.sku,
      barcode: p.barcode,
      price: p.price,
      costPrice: p.costPrice,
      stock: p.stock,
      minStock: p.minStock,
      image: p.image,
      description: p.description,
      isActive: p.isActive,
      createdAt: p.createdAt.toISOString(),
      salesCount: p._count.saleItems,
    })),
  };

  return <InventoryClient data={data} />;
}
