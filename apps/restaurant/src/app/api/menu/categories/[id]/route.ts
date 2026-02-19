import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRestaurantSessionFromRequest } from '@/lib/session';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRestaurantSessionFromRequest(req);
    const { id } = await params;
    const body = await req.json();
    const { name, nameEn, icon, color, sortOrder, isActive, isSeasonal, parentId } = body;

    const existing = await prisma.menuCategory.findFirst({
      where: { id, restaurantId: session.restaurantId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'კატეგორია ვერ მოიძებნა' }, { status: 404 });
    }

    const category = await prisma.menuCategory.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name?.trim() || existing.name }),
        ...(nameEn !== undefined && { nameEn: nameEn?.trim() || null }),
        ...(icon !== undefined && { icon: icon?.trim() || null }),
        ...(color !== undefined && { color: color?.trim() || null }),
        ...(typeof sortOrder === 'number' && { sortOrder }),
        ...(typeof isActive === 'boolean' && { isActive }),
        ...(typeof isSeasonal === 'boolean' && { isSeasonal }),
        ...(parentId !== undefined && { parentId: parentId || null }),
      },
    });
    return NextResponse.json(category);
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRestaurantSessionFromRequest(req);
    const { id } = await params;

    const existing = await prisma.menuCategory.findFirst({
      where: { id, restaurantId: session.restaurantId },
      include: { _count: { select: { items: true } } },
    });
    if (!existing) {
      return NextResponse.json({ error: 'კატეგორია ვერ მოიძებნა' }, { status: 404 });
    }
    if (existing._count.items > 0) {
      return NextResponse.json(
        { error: 'კატეგორიაში კერძებია. ჯერ წაშალეთ ან გადაიტანეთ კერძები.' },
        { status: 400 }
      );
    }

    await prisma.menuCategory.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
