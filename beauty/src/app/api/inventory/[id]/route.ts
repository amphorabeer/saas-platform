import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/inventory/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const product = await prisma.product.findFirst({
      where: { id: params.id, salonId: session.user.salonId },
    });

    if (!product) return NextResponse.json({ message: 'ვერ მოიძებნა' }, { status: 404 });

    return NextResponse.json(product);
  } catch (error: any) {
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

// PUT /api/inventory/[id]
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

    const product = await prisma.product.findFirst({
      where: { id: params.id, salonId: session.user.salonId },
    });

    if (!product) return NextResponse.json({ message: 'ვერ მოიძებნა' }, { status: 404 });

    const body = await req.json();

    // Stock adjustment (quick +/- from table)
    if (body.stockAdjust !== undefined) {
      const updated = await prisma.product.update({
        where: { id: params.id },
        data: { stock: Math.max(0, product.stock + Number(body.stockAdjust)) },
      });
      return NextResponse.json(updated);
    }

    // Full update
    const updated = await prisma.product.update({
      where: { id: params.id },
      data: {
        name: body.name?.trim() || product.name,
        category: body.category !== undefined ? body.category : product.category,
        brand: body.brand !== undefined ? body.brand : product.brand,
        sku: body.sku !== undefined ? body.sku : product.sku,
        barcode: body.barcode !== undefined ? body.barcode : product.barcode,
        price: body.price !== undefined ? Number(body.price) : product.price,
        costPrice: body.costPrice !== undefined ? (body.costPrice ? Number(body.costPrice) : null) : product.costPrice,
        stock: body.stock !== undefined ? Number(body.stock) : product.stock,
        minStock: body.minStock !== undefined ? Number(body.minStock) : product.minStock,
        image: body.image !== undefined ? body.image : product.image,
        description: body.description !== undefined ? body.description : product.description,
        isActive: body.isActive !== undefined ? body.isActive : product.isActive,
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('PUT /api/inventory/[id] error:', error?.message || error);
    return NextResponse.json({ message: 'Server error', detail: error?.message }, { status: 500 });
  }
}

// DELETE /api/inventory/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    if (!['OWNER', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ message: 'არ გაქვთ უფლება' }, { status: 403 });
    }

    const product = await prisma.product.findFirst({
      where: { id: params.id, salonId: session.user.salonId },
    });

    if (!product) return NextResponse.json({ message: 'ვერ მოიძებნა' }, { status: 404 });

    await prisma.product.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('DELETE /api/inventory/[id] error:', error?.message || error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
