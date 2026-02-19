import { NextRequest, NextResponse } from 'next/server';
import { Decimal } from '@prisma/client/runtime/library';
import { prisma } from '@/lib/prisma';
import { requireRestaurantSessionFromRequest } from '@/lib/session';
import type { KDSStation } from '#prisma';

function generateOrderNumber(restaurantId: string): Promise<string> {
  const now = new Date();
  const yy = now.getFullYear().toString().slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const prefix = `${yy}${mm}${dd}-`;

  return prisma.restaurantOrder
    .findFirst({
      where: { restaurantId, orderNumber: { startsWith: prefix } },
      orderBy: { orderNumber: 'desc' },
      select: { orderNumber: true },
    })
    .then((last) => {
      const next = last
        ? parseInt(last.orderNumber.slice(-3), 10) + 1
        : 1;
      return `${prefix}${String(next).padStart(3, '0')}`;
    });
}

/** GET /api/pos/orders — active orders (optional query: tableId, status) */
export async function GET(req: NextRequest) {
  try {
    const session = await requireRestaurantSessionFromRequest(req);
    const { searchParams } = new URL(req.url);
    const tableId = searchParams.get('tableId') || undefined;
    const status = searchParams.get('status') || undefined;

    const where = {
      restaurantId: session.restaurantId,
      ...(tableId && { tableId }),
      ...(status && { status: status as 'DRAFT' | 'CONFIRMED' | 'IN_PROGRESS' | 'READY' | 'SERVED' | 'PAID' | 'CANCELLED' }),
    };

    const orders = await prisma.restaurantOrder.findMany({
      where,
      include: {
        items: true,
        table: { select: { id: true, number: true, zone: { select: { name: true } } } },
        waiter: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const serialized = orders.map((o) => ({
      ...o,
      subtotal: Number(o.subtotal),
      taxAmount: Number(o.taxAmount),
      discountAmount: Number(o.discountAmount),
      tipAmount: Number(o.tipAmount),
      totalAmount: Number(o.totalAmount),
      paidAmount: Number(o.paidAmount),
      changeAmount: Number(o.changeAmount),
      items: o.items.map((i) => ({
        ...i,
        quantity: Number(i.quantity),
        unitPrice: Number(i.unitPrice),
        totalPrice: Number(i.totalPrice),
      })),
    }));
    return NextResponse.json(serialized);
  } catch (e: unknown) {
    console.error('[POS orders GET]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unauthorized' },
      { status: 401 }
    );
  }
}

/** POST /api/pos/orders — create order + items + kitchen tickets */
export async function POST(req: Request) {
  try {
    const session = await requireRestaurantSessionFromRequest(req);
    const body = await req.json();
    const {
      orderType,
      tableId,
      tableSessionId,
      waiterId,
      customerName,
      customerPhone,
      deliveryAddress,
      notes,
      discountAmount,
      items: itemsPayload,
    } = body;

    if (!itemsPayload || !Array.isArray(itemsPayload) || itemsPayload.length === 0) {
      return NextResponse.json(
        { error: 'მინიმუმ ერთი პოზიცია აუცილებელია' },
        { status: 400 }
      );
    }

    const orderTypeVal = orderType === 'TAKEAWAY' ? 'TAKEAWAY' : orderType === 'DELIVERY' ? 'DELIVERY' : 'DINE_IN';
    if (orderTypeVal === 'DINE_IN' && !tableId) {
      return NextResponse.json(
        { error: 'Dine In-ისთვის მაგიდა აუცილებელია' },
        { status: 400 }
      );
    }

    let tableSessionIdFinal: string | null = tableSessionId || null;
    let tableIdFinal: string | null = tableId || null;

    if (orderTypeVal === 'DINE_IN' && tableId) {
      const table = await prisma.restaurantTable.findFirst({
        where: { id: tableId, restaurantId: session.restaurantId },
      });
      if (!table) {
        return NextResponse.json({ error: 'მაგიდა ვერ მოიძებნა' }, { status: 404 });
      }
      await prisma.restaurantTable.update({
        where: { id: tableId },
        data: { status: 'OCCUPIED' },
      });
      if (!tableSessionIdFinal) {
        let activeSession = await prisma.tableSession.findFirst({
          where: { tableId, isActive: true },
        });
        if (!activeSession) {
          activeSession = await prisma.tableSession.create({
            data: {
              tableId,
              waiterId: waiterId || session.employeeId || null,
              guestCount: 0,
              isActive: true,
            },
          });
        }
        tableSessionIdFinal = activeSession.id;
      }
    }

    const orderNumber = await generateOrderNumber(session.restaurantId);
    const discountNum = Number(discountAmount) || 0;

    let subtotal = 0;
    for (const it of itemsPayload) {
      subtotal += Number(it.totalPrice) || 0;
    }
    const taxAmount = 0;
    const totalAmount = Math.max(0, subtotal - discountNum + taxAmount);

    const order = await prisma.restaurantOrder.create({
      data: {
        restaurantId: session.restaurantId,
        orderNumber,
        tableSessionId: tableSessionIdFinal,
        tableId: tableIdFinal,
        waiterId: waiterId || session.employeeId || null,
        orderType: orderTypeVal,
        status: 'CONFIRMED',
        subtotal: new Decimal(subtotal),
        taxAmount: new Decimal(taxAmount),
        discountAmount: new Decimal(discountNum),
        tipAmount: new Decimal(0),
        totalAmount: new Decimal(totalAmount),
        customerName: customerName?.trim() || null,
        customerPhone: customerPhone?.trim() || null,
        deliveryAddress: deliveryAddress?.trim() || null,
        notes: notes?.trim() || null,
      },
    });

    const kdsStationMap = new Map<string, { menuItemName: string; quantity: number; unitPrice: number; totalPrice: number; modifiers: unknown; specialInstructions: string | null }[]>();

    for (const it of itemsPayload) {
      const qty = Number(it.quantity) || 1;
      const unitPrice = Number(it.unitPrice) || 0;
      const totalPrice = Number(it.totalPrice) || unitPrice * qty;
      const station = (it.kdsStation || 'HOT') as 'HOT' | 'COLD' | 'BAR' | 'PIZZA' | 'GRILL' | 'PASTRY';

      await prisma.restaurantOrderItem.create({
        data: {
          orderId: order.id,
          menuItemId: it.menuItemId,
          menuItemName: it.menuItemName || 'Item',
          quantity: qty,
          unitPrice: new Decimal(unitPrice),
          totalPrice: new Decimal(totalPrice),
          modifiers: (it.modifiers ?? undefined) as object | undefined,
          specialInstructions: it.specialInstructions?.trim() || null,
          kdsStation: station,
        },
      });

      const list = kdsStationMap.get(station) || [];
      list.push({
        menuItemName: it.menuItemName || 'Item',
        quantity: qty,
        unitPrice,
        totalPrice,
        modifiers: it.modifiers || null,
        specialInstructions: it.specialInstructions?.trim() || null,
      });
      kdsStationMap.set(station, list);
    }

    const table = order.tableId
      ? await prisma.restaurantTable.findUnique({
          where: { id: order.tableId },
          include: { zone: { select: { name: true } } },
        })
      : null;
    const waiter = order.waiterId
      ? await prisma.restaurantEmployee.findUnique({
          where: { id: order.waiterId },
          select: { firstName: true, lastName: true },
        })
      : null;

    for (const [station, items] of kdsStationMap) {
      await prisma.kitchenTicket.create({
        data: {
          restaurantId: session.restaurantId,
          orderId: order.id,
          station: station as KDSStation,
          status: 'NEW',
          items: items as unknown as object,
          tableNumber: table?.number ?? null,
          waiterName: waiter ? `${waiter.firstName} ${waiter.lastName}`.trim() : null,
          priority: 0,
        },
      });
    }

    // Auto-deduction: deduct ingredients per recipe for each order item
    const performedBy = session.name || session.email || '';
    for (const it of itemsPayload) {
      const menuItemId = it.menuItemId;
      const orderQty = Number(it.quantity) || 1;
      const recipe = await prisma.recipe.findFirst({
        where: { menuItemId, restaurantId: session.restaurantId },
        include: { ingredients: { include: { ingredient: true } } },
      });
      if (!recipe || recipe.ingredients.length === 0) continue;
      const yieldVal = Number(recipe.yield) || 1;
      for (const ri of recipe.ingredients) {
        const deductQty = (Number(ri.quantity) * orderQty) / yieldVal;
        const ing = ri.ingredient;
        const current = Number(ing.currentStock);
        const newStock = Math.max(0, current - deductQty);
        await prisma.$transaction([
          prisma.ingredient.update({
            where: { id: ing.id },
            data: { currentStock: new Decimal(newStock) },
          }),
          prisma.ingredientOperation.create({
            data: {
              restaurantId: session.restaurantId,
              ingredientId: ing.id,
              type: 'AUTO_DEDUCTION',
              quantity: new Decimal(-deductQty),
              unitCost: ing.costPerUnit,
              reference: orderNumber,
              notes: null,
              performedBy: performedBy || null,
            },
          }),
        ]);
      }
    }

    const created = await prisma.restaurantOrder.findUnique({
      where: { id: order.id },
      include: {
        items: true,
        table: { select: { id: true, number: true, zone: { select: { name: true } } } },
        waiter: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    const out = {
      ...created,
      id: created!.id,
      orderNumber: created!.orderNumber,
      subtotal: Number(created!.subtotal),
      taxAmount: Number(created!.taxAmount),
      discountAmount: Number(created!.discountAmount),
      tipAmount: Number(created!.tipAmount),
      totalAmount: Number(created!.totalAmount),
      paidAmount: Number(created!.paidAmount),
      changeAmount: Number(created!.changeAmount),
      items: created!.items.map((i) => ({
        ...i,
        quantity: Number(i.quantity),
        unitPrice: Number(i.unitPrice),
        totalPrice: Number(i.totalPrice),
      })),
    };
    return NextResponse.json(out);
  } catch (e: unknown) {
    console.error('[POS orders POST]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 }
    );
  }
}
