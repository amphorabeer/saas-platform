import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRestaurantSessionFromRequest } from '@/lib/session';

const DEFAULT_CATEGORIES = [
  { name: 'ქირა', icon: 'Building', color: '#6366f1' },
  { name: 'ხელფასი', icon: 'Users', color: '#22c55e' },
  { name: 'კომუნალური', icon: 'Zap', color: '#eab308' },
  { name: 'ტრანსპორტი', icon: 'Truck', color: '#f97316' },
  { name: 'მარკეტინგი', icon: 'Megaphone', color: '#ec4899' },
  { name: 'საოფისე', icon: 'Briefcase', color: '#0ea5e9' },
  { name: 'სხვა', icon: 'MoreHorizontal', color: '#64748b' },
];

/** GET — expense categories list */
export async function GET(req: NextRequest) {
  try {
    const session = await requireRestaurantSessionFromRequest(req);

    let categories = await prisma.expenseCategory.findMany({
      where: { restaurantId: session.restaurantId },
      orderBy: { name: 'asc' },
    });

    if (categories.length === 0) {
      await prisma.expenseCategory.createMany({
        data: DEFAULT_CATEGORIES.map((c) => ({
          restaurantId: session.restaurantId,
          name: c.name,
          icon: c.icon,
          color: c.color,
          isDefault: true,
        })),
      });
      categories = await prisma.expenseCategory.findMany({
        where: { restaurantId: session.restaurantId },
        orderBy: { name: 'asc' },
      });
    }

    return NextResponse.json(
      categories.map((c) => ({
        id: c.id,
        name: c.name,
        icon: c.icon,
        color: c.color,
        isDefault: c.isDefault,
      }))
    );
  } catch (e: unknown) {
    console.error('[finance expenses categories GET]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unauthorized' },
      { status: 401 }
    );
  }
}

/** POST — new category */
export async function POST(req: NextRequest) {
  try {
    const session = await requireRestaurantSessionFromRequest(req);
    const body = await req.json();
    const { name, icon, color } = body as { name?: string; icon?: string; color?: string };
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    const category = await prisma.expenseCategory.create({
      data: {
        restaurantId: session.restaurantId,
        name: name.trim(),
        icon: icon ?? undefined,
        color: color ?? undefined,
      },
    });

    return NextResponse.json({
      id: category.id,
      name: category.name,
      icon: category.icon,
      color: category.color,
      isDefault: category.isDefault,
    });
  } catch (e: unknown) {
    console.error('[finance expenses categories POST]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unauthorized' },
      { status: 401 }
    );
  }
}
