// ==========================================
// FIX: apps/restaurant/src/app/api/tables/[id]/route.ts
// 
// PROBLEM: Prisma cached plan / type mismatch causes posX/posY 
// to not save correctly after table column type changes.
//
// SOLUTION: Use raw SQL for position-only updates
// ==========================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRestaurantSessionFromRequest } from '@/lib/session';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRestaurantSessionFromRequest(req);
    const { id } = await params;

    const table = await prisma.restaurantTable.findFirst({
      where: { id, restaurantId: session.restaurantId },
      include: {
        zone: { select: { id: true, name: true, color: true } },
      },
    });
    if (!table) {
      return NextResponse.json({ error: 'მაგიდა ვერ მოიძებნა' }, { status: 404 });
    }
    return NextResponse.json(table);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRestaurantSessionFromRequest(req);
    const { id } = await params;
    const body = await req.json();

    // Verify table belongs to this restaurant
    const existing = await prisma.restaurantTable.findFirst({
      where: { id, restaurantId: session.restaurantId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'მაგიდა ვერ მოიძებნა' }, { status: 404 });
    }

    // Check if this is a position-only update (from drag & drop)
    const isPositionOnly = 
      body.posX !== undefined && 
      body.posY !== undefined && 
      Object.keys(body).filter(k => k !== 'posX' && k !== 'posY').length === 0;

    if (isPositionOnly) {
      // Use raw SQL for position updates to bypass Prisma type cache
      const posX = Math.round(Number(body.posX) || 0);
      const posY = Math.round(Number(body.posY) || 0);
      
      await prisma.$executeRawUnsafe(
        `UPDATE "RestaurantTable" SET "posX" = $1, "posY" = $2, "updatedAt" = NOW() WHERE "id" = $3`,
        posX, posY, id
      );

      // Fetch updated record
      const updated = await prisma.restaurantTable.findUnique({
        where: { id },
        include: {
          zone: { select: { id: true, name: true, color: true } },
        },
      });
      return NextResponse.json(updated);
    }

    // Full update (from edit form)
    const allowed = [
      'number', 'label', 'zoneId', 'seats', 'shape',
      'width', 'height', 'rotation', 'status', 'isActive', 'posX', 'posY',
    ] as const;
    
    const data: Record<string, unknown> = {};
    for (const key of allowed) {
      if (body[key] !== undefined) {
        if (key === 'seats') data[key] = Math.min(20, Math.max(1, Number(body[key]) || 4));
        else if (key === 'width' || key === 'height') data[key] = Math.max(50, Number(body[key]) || 80);
        else if (key === 'number') data[key] = String(body[key]).trim();
        else if (key === 'label') data[key] = body[key] ? String(body[key]).trim() : null;
        else if (key === 'posX' || key === 'posY') data[key] = Math.round(Number(body[key]) || 0);
        else if (key === 'rotation') data[key] = Number(body[key]) || 0;
        else data[key] = body[key];
      }
    }

    // Use raw SQL for updates that include posX/posY
    if (data.posX !== undefined || data.posY !== undefined) {
      // Build SET clause dynamically
      const setClauses: string[] = [];
      const values: unknown[] = [];
      let paramIndex = 1;

      for (const [key, value] of Object.entries(data)) {
        setClauses.push(`"${key}" = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
      setClauses.push(`"updatedAt" = NOW()`);
      values.push(id);

      await prisma.$executeRawUnsafe(
        `UPDATE "RestaurantTable" SET ${setClauses.join(', ')} WHERE "id" = $${paramIndex}`,
        ...values
      );

      const updated = await prisma.restaurantTable.findUnique({
        where: { id },
        include: {
          zone: { select: { id: true, name: true, color: true } },
        },
      });
      return NextResponse.json(updated);
    }

    const table = await prisma.restaurantTable.update({
      where: { id },
      data,
      include: {
        zone: { select: { id: true, name: true, color: true } },
      },
    });
    return NextResponse.json(table);
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

    const existing = await prisma.restaurantTable.findFirst({
      where: { id, restaurantId: session.restaurantId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'მაგიდა ვერ მოიძებნა' }, { status: 404 });
    }

    await prisma.restaurantTable.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}