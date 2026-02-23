import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const services = await prisma.service.findMany({
      where: { salonId: session.user.salonId },
      include: { category: true },
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json(services);
  } catch (error) {
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { name, description, duration, price, categoryId, isActive } = body;

    if (!name?.trim() || !price) {
      return NextResponse.json({ message: 'სახელი და ფასი სავალდებულოა' }, { status: 400 });
    }

    const service = await prisma.service.create({
      data: {
        salonId: session.user.salonId,
        name: name.trim(),
        description: description || null,
        duration: duration || 60,
        price: parseFloat(price),
        categoryId: categoryId || null,
        isActive: isActive ?? true,
      },
    });

    return NextResponse.json(service, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
