import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { BookingClient } from './BookingClient';

export default async function BookingPage({ params }: { params: { slug: string } }) {
  const salon = await prisma.salon.findUnique({
    where: { slug: params.slug },
    select: { id: true, name: true, slug: true, address: true, phone: true },
  });

  if (!salon) notFound();

  return <BookingClient slug={params.slug} salonName={salon.name} />;
}
