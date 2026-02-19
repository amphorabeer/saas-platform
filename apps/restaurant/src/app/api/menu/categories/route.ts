import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { requireRestaurantSessionFromRequest } from '@/lib/session';

export async function GET(req: NextRequest) {
  try {
    const session = await requireRestaurantSessionFromRequest(req);
    if (process.env.NODE_ENV === 'development') {
      console.log('SESSION:', JSON.stringify({ hasSession: !!session, restaurantId: session?.restaurantId }, null, 2));
    }
    if (!session.restaurantId) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'MISSING_RESTAURANT_ID', message: 'გთხოვთ თავიდან შეხვიდეთ სისტემაში' },
        { status: 401 }
      );
    }
    const categories = await prisma.menuCategory.findMany({
      where: { restaurantId: session.restaurantId },
      include: { parent: { select: { id: true, name: true } } },
      orderBy: { sortOrder: 'asc' },
    });
    return NextResponse.json(categories);
  } catch (e) {
    console.error('[api/menu/categories GET]', e);
    return NextResponse.json(
      { error: 'Unauthorized', message: 'გთხოვთ თავიდან შეხვიდეთ სისტემაში' },
      { status: 401 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    console.log('=== MENU CATEGORIES SESSION ===');
    console.log('session:', JSON.stringify(session, null, 2));
    console.log('restaurantId:', (session?.user as { restaurantId?: string })?.restaurantId);

    const sessionFromRequest = await requireRestaurantSessionFromRequest(req);
    if (!sessionFromRequest.restaurantId) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'MISSING_RESTAURANT_ID', message: 'გთხოვთ თავიდან შეხვიდეთ სისტემაში' },
        { status: 401 }
      );
    }
    const body = await req.json();
    const { name, nameEn, icon, color, sortOrder, isActive, isSeasonal, parentId } = body;
    if (!name?.trim()) {
      return NextResponse.json({ error: 'სახელი აუცილებელია' }, { status: 400 });
    }
    const category = await prisma.menuCategory.create({
      data: {
        restaurantId: sessionFromRequest.restaurantId,
        name: name.trim(),
        nameEn: nameEn?.trim() || null,
        icon: icon?.trim() || null,
        color: color?.trim() || null,
        sortOrder: typeof sortOrder === 'number' ? sortOrder : 0,
        isActive: isActive !== false,
        isSeasonal: isSeasonal === true,
        parentId: parentId || null,
      },
    });
    return NextResponse.json(category);
  } catch (e: unknown) {
    console.error('[api/menu/categories POST]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 }
    );
  }
}
