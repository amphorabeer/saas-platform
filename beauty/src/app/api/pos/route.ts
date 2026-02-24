import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Generate receipt number: YYYYMMDD-XXXX
function generateReceiptNumber(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${date}-${rand}`;
}

// GET /api/pos — list sales
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const sales = await prisma.sale.findMany({
      where: { salonId: session.user.salonId },
      include: {
        items: { include: { service: true, product: true } },
        client: true,
        staff: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    return NextResponse.json(sales);
  } catch (error: any) {
    console.error('GET /api/pos error:', error?.message || error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

// POST /api/pos — create new sale
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const {
      clientId,
      staffId,
      appointmentId,
      paymentMethod = 'CASH',
      discountType,
      discount = 0,
      notes,
      items,
    } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ message: 'კალათა ცარიელია' }, { status: 400 });
    }

    // Calculate totals
    const subtotal = items.reduce(
      (sum: number, item: any) => sum + item.unitPrice * item.quantity,
      0
    );
    const discountAmount = Math.min(discount, subtotal);
    const total = Math.max(subtotal - discountAmount, 0);

    const sale = await prisma.sale.create({
      data: {
        salonId: session.user.salonId,
        clientId: clientId || null,
        staffId: staffId || null,
        appointmentId: appointmentId || null,
        subtotal,
        discount: discountAmount,
        discountType: discountType || null,
        tax: 0,
        total,
        paymentMethod,
        paymentStatus: 'COMPLETED',
        receiptNumber: generateReceiptNumber(),
        notes: notes || null,
        items: {
          create: items.map((item: any) => ({
            type: item.type || 'SERVICE',
            serviceId: item.serviceId || null,
            productId: item.productId || null,
            name: item.name,
            quantity: item.quantity || 1,
            unitPrice: item.unitPrice,
            total: item.unitPrice * (item.quantity || 1),
          })),
        },
      },
      include: {
        items: true,
        client: true,
        staff: true,
      },
    });

    // Update client loyalty points if client is selected
    if (clientId) {
      const pointsEarned = Math.floor(total / 10); // 1 point per 10 GEL
      if (pointsEarned > 0) {
        await prisma.$transaction([
          prisma.client.update({
            where: { id: clientId },
            data: { loyaltyPoints: { increment: pointsEarned } },
          }),
          prisma.loyaltyTransaction.create({
            data: {
              clientId,
              points: pointsEarned,
              type: 'EARN',
              saleId: sale.id,
              description: `გაყიდვა #${sale.receiptNumber}`,
            },
          }),
        ]);
      }
    }

    // Decrement product stock
    const productItems = items.filter((item: any) => item.type === 'PRODUCT' && item.productId);
    if (productItems.length > 0) {
      await prisma.$transaction(
        productItems.map((item: any) =>
          prisma.product.update({
            where: { id: item.productId },
            data: { stock: { decrement: item.quantity || 1 } },
          })
        )
      );
    }

    return NextResponse.json(sale, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/pos error:', error?.message || error);
    return NextResponse.json(
      { message: 'Server error', detail: error?.message },
      { status: 500 }
    );
  }
}
