import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/inventory — list products
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const products = await prisma.product.findMany({
      where: { salonId: session.user.salonId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(products);
  } catch (error: any) {
    console.error('GET /api/inventory error:', error?.message || error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

// POST /api/inventory — create product
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    if (!['OWNER', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ message: 'არ გაქვთ უფლება' }, { status: 403 });
    }

    const body = await req.json();

    if (!body.name?.trim()) {
      return NextResponse.json({ message: 'სახელი სავალდებულოა' }, { status: 400 });
    }

    const product = await prisma.product.create({
      data: {
        salonId: session.user.salonId,
        name: body.name.trim(),
        category: body.category || null,
        brand: body.brand || null,
        sku: body.sku || null,
        barcode: body.barcode || null,
        price: Number(body.price) || 0,
        costPrice: body.costPrice ? Number(body.costPrice) : null,
        stock: Number(body.stock) || 0,
        minStock: Number(body.minStock) || 5,
        image: body.image || null,
        description: body.description || null,
        isActive: body.isActive ?? true,
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/inventory error:', error?.message || error);
    return NextResponse.json({ message: 'Server error', detail: error?.message }, { status: 500 });
  }
}
