import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { ReviewsClient } from './ReviewsClient';

export default async function ReviewsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/auth/login');

  const salonId = session.user.salonId;

  const [reviews, staff] = await Promise.all([
    prisma.review.findMany({
      where: { salonId },
      include: { client: true, staff: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.staff.findMany({
      where: { salonId, isActive: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  const data = {
    reviews: reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      response: r.response,
      isPublic: r.isPublic,
      clientName: r.client?.name || 'ანონიმური',
      clientId: r.clientId,
      staffName: r.staff?.name || null,
      staffId: r.staffId,
      createdAt: r.createdAt.toISOString(),
    })),
    staff: staff.map((s) => ({ id: s.id, name: s.name })),
  };

  return <ReviewsClient data={data} />;
}
