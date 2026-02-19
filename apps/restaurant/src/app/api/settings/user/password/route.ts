import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { requireRestaurantSessionFromRequest } from '@/lib/session';

/** PUT /api/settings/user/password — change password (old, new, confirm) */
export async function PUT(req: Request) {
  try {
    const session = await requireRestaurantSessionFromRequest(req);

    const body = await req.json();
    const oldPassword = typeof body.oldPassword === 'string' ? body.oldPassword : '';
    const newPassword = typeof body.newPassword === 'string' ? body.newPassword : '';
    const confirmPassword =
      typeof body.confirmPassword === 'string' ? body.confirmPassword : '';

    if (!oldPassword || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { error: 'ძველი პაროლი, ახალი პაროლი და დადასტურება სავალდებულოა' },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: 'ახალი პაროლი და დადასტურება არ ემთხვევა' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'ახალი პაროლი უნდა იყოს მინიმუმ 6 სიმბოლო' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, password: true },
    });

    if (!user?.password) {
      return NextResponse.json(
        { error: 'მომხმარებელი ვერ მოიძებნა' },
        { status: 404 }
      );
    }

    const valid = await bcrypt.compare(oldPassword, user.password);
    if (!valid) {
      return NextResponse.json(
        { error: 'ძველი პაროლი არასწორია' },
        { status: 400 }
      );
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: session.userId },
      data: { password: hashed },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof Error && e.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[api/settings/user/password PUT]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
