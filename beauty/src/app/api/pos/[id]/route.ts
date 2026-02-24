import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/pos/[id] — get single sale
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const sale = await prisma.sale.findFirst({
      where: { id: params.id, salonId: session.user.salonId },
      include: {
        items: { include: { service: true, product: true } },
        client: true,
        staff: true,
      },
    });

    if (!sale) return NextResponse.json({ message: 'გაყიდვა ვერ მოიძებნა' }, { status: 404 });

    return NextResponse.json(sale);
  } catch (error: any) {
    console.error('GET /api/pos/[id] error:', error?.message || error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

// PUT /api/pos/[id] — update sale (refund, status change)
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    if (!['OWNER', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ message: 'არ გაქვთ უფლება' }, { status: 403 });
    }

    const body = await req.json();
    const { paymentStatus } = body;

    const sale = await prisma.sale.findFirst({
      where: { id: params.id, salonId: session.user.salonId },
    });

    if (!sale) return NextResponse.json({ message: 'გაყიდვა ვერ მოიძებნა' }, { status: 404 });

    const updated = await prisma.sale.update({
      where: { id: params.id },
      data: { paymentStatus },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('PUT /api/pos/[id] error:', error?.message || error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
