import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/settings
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const salon = await prisma.salon.findUnique({
      where: { id: session.user.salonId },
    });

    if (!salon) return NextResponse.json({ message: 'სალონი ვერ მოიძებნა' }, { status: 404 });

    return NextResponse.json({
      id: salon.id,
      name: salon.name,
      slug: salon.slug,
      address: salon.address,
      phone: salon.phone,
      email: salon.email,
      description: salon.description,
      workingHours: salon.workingHours || {},
      settings: salon.settings || {},
    });
  } catch (error: any) {
    return NextResponse.json({ message: 'Server error', detail: error?.message }, { status: 500 });
  }
}

// PUT /api/settings
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    if (!['OWNER', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ message: 'არ გაქვთ უფლება' }, { status: 403 });
    }

    const body = await req.json();
    const updateData: any = {};

    if (body.name !== undefined) updateData.name = body.name;
    if (body.slug !== undefined) {
      // Validate slug
      const slugRegex = /^[a-z0-9-]+$/;
      if (!slugRegex.test(body.slug)) {
        return NextResponse.json({ message: 'slug უნდა შეიცავდეს მხოლოდ a-z, 0-9, -' }, { status: 400 });
      }
      // Check uniqueness
      const existing = await prisma.salon.findFirst({
        where: { slug: body.slug, NOT: { id: session.user.salonId } },
      });
      if (existing) {
        return NextResponse.json({ message: 'ეს slug უკვე დაკავებულია' }, { status: 400 });
      }
      updateData.slug = body.slug;
    }
    if (body.address !== undefined) updateData.address = body.address;
    if (body.phone !== undefined) updateData.phone = body.phone;
    if (body.email !== undefined) updateData.email = body.email;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.workingHours !== undefined) updateData.workingHours = body.workingHours;
    if (body.settings !== undefined) updateData.settings = body.settings;

    const updated = await prisma.salon.update({
      where: { id: session.user.salonId },
      data: updateData,
    });

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      slug: updated.slug,
      address: updated.address,
      phone: updated.phone,
      email: updated.email,
      description: updated.description,
      workingHours: updated.workingHours,
      settings: updated.settings,
    });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ message: 'ეს slug უკვე დაკავებულია' }, { status: 400 });
    }
    return NextResponse.json({ message: 'Server error', detail: error?.message }, { status: 500 });
  }
}
