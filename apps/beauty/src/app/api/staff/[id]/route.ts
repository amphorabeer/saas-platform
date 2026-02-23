import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

// GET /api/staff/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const staff = await prisma.staff.findFirst({
      where: { id: params.id, salonId: session.user.salonId },
      include: {
        schedules: true,
        staffServices: { include: { service: true } },
        _count: { select: { appointments: true, reviews: true } },
      },
    });

    if (!staff) {
      return NextResponse.json({ message: 'ვერ მოიძებნა' }, { status: 404 });
    }

    return NextResponse.json(staff);
  } catch (error) {
    console.error('GET /api/staff/[id] error:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

// PUT /api/staff/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    if (!['OWNER', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ message: 'არ გაქვთ უფლება' }, { status: 403 });
    }

    const body = await req.json();
    const {
      name,
      email,
      phone,
      role,
      specialties,
      bio,
      pin,
      password,
      commissionType,
      commissionRate,
      isActive,
      schedules,
    } = body;

    // Check ownership
    const existing = await prisma.staff.findFirst({
      where: { id: params.id, salonId: session.user.salonId },
    });
    if (!existing) {
      return NextResponse.json({ message: 'ვერ მოიძებნა' }, { status: 404 });
    }

    // Build update data
    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (email !== undefined) updateData.email = email || null;
    if (phone !== undefined) updateData.phone = phone || null;
    if (role !== undefined) updateData.role = role;
    if (specialties !== undefined) updateData.specialties = specialties;
    if (bio !== undefined) updateData.bio = bio || null;
    if (pin !== undefined) updateData.pin = pin || null;
    if (commissionType !== undefined) updateData.commissionType = commissionType;
    if (commissionRate !== undefined) updateData.commissionRate = commissionRate;
    if (isActive !== undefined) updateData.isActive = isActive;

    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 10);
    }

    const staff = await prisma.staff.update({
      where: { id: params.id },
      data: updateData,
    });

    // Update schedules if provided
    if (schedules && Array.isArray(schedules)) {
      await prisma.staffSchedule.deleteMany({ where: { staffId: params.id } });
      await prisma.staffSchedule.createMany({
        data: schedules.map((s: any) => ({
          staffId: params.id,
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime || '09:00',
          endTime: s.endTime || '18:00',
          isOff: s.isOff || false,
        })),
      });
    }

    return NextResponse.json(staff);
  } catch (error) {
    console.error('PUT /api/staff/[id] error:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

// DELETE /api/staff/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    if (!['OWNER', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ message: 'არ გაქვთ უფლება' }, { status: 403 });
    }

    // Check ownership
    const existing = await prisma.staff.findFirst({
      where: { id: params.id, salonId: session.user.salonId },
    });
    if (!existing) {
      return NextResponse.json({ message: 'ვერ მოიძებნა' }, { status: 404 });
    }

    // Don't allow deleting self
    if (existing.id === session.user.id) {
      return NextResponse.json(
        { message: 'საკუთარი ანგარიშის წაშლა შეუძლებელია' },
        { status: 400 }
      );
    }

    await prisma.staff.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/staff/[id] error:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
