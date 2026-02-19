import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  getRestaurantSessionFromRequest,
  requireRestaurantSessionFromRequest,
} from '@/lib/session';

/** GET /api/settings/user — user profile + restCode from session */
export async function GET(req: Request) {
  try {
    const session = await getRestaurantSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, email: true, name: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      ...user,
      restCode: session.restCode,
    });
  } catch (e) {
    console.error('[api/settings/user GET]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/** PUT /api/settings/user — update name only */
export async function PUT(req: Request) {
  try {
    const session = await requireRestaurantSessionFromRequest(req);

    const body = await req.json();
    const name = typeof body.name === 'string' ? body.name.trim() : undefined;
    if (name === undefined) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id: session.userId },
      data: { name: name || null },
      select: { id: true, email: true, name: true },
    });

    return NextResponse.json({ ...user, restCode: session.restCode });
  } catch (e) {
    if (e instanceof Error && e.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[api/settings/user PUT]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
