import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  getRestaurantSessionFromRequest,
  requireRestaurantSessionFromRequest,
} from '@/lib/session';

const ALLOWED_ROLES = ['RESTAURANT_OWNER', 'MANAGER'];

/** GET /api/settings/restaurant — restaurant profile + settings (session restaurantId) */
export async function GET(req: Request) {
  try {
    const session = await getRestaurantSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: session.restaurantId },
    });

    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    const organization = await prisma.organization.findFirst({
      where: { tenantId: restaurant.tenantId },
      select: { company: true, taxId: true, address: true, phone: true, email: true, bankName: true, bankAccount: true, directorName: true, bankSWIFT: true },
    });

    const settings =
      restaurant.settings && typeof restaurant.settings === 'object'
        ? restaurant.settings
        : {};

    return NextResponse.json({
      ...restaurant,
      settings,
      organization: organization ?? { company: null, taxId: null, address: null, phone: null, email: null, bankName: null, bankAccount: null, directorName: null, bankSWIFT: null },
    });
  } catch (e) {
    console.error('[api/settings/restaurant GET]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/** PUT /api/settings/restaurant — update restaurant (RESTAURANT_OWNER or MANAGER only) */
export async function PUT(req: Request) {
  try {
    const session = await requireRestaurantSessionFromRequest(req);
    if (!ALLOWED_ROLES.includes(session.employeeRole)) {
      return NextResponse.json(
        { error: 'Only owner or manager can update restaurant settings' },
        { status: 403 }
      );
    }

    const body = await req.json();

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: session.restaurantId },
    });
    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    const { company, bankName, bankAccount, directorName, bankSWIFT, ...restaurantBody } = body;

    const updateData: {
      name?: string;
      type?: string;
      address?: string | null;
      phone?: string | null;
      email?: string | null;
      taxId?: string | null;
      currency?: string;
      timezone?: string;
      logoUrl?: string | null;
      isActive?: boolean;
      settings?: object;
    } = {};

    if (typeof restaurantBody.name === 'string') updateData.name = restaurantBody.name;
    if (typeof restaurantBody.type === 'string') updateData.type = restaurantBody.type;
    if (restaurantBody.address !== undefined) updateData.address = restaurantBody.address ?? null;
    if (restaurantBody.phone !== undefined) updateData.phone = restaurantBody.phone ?? null;
    if (restaurantBody.email !== undefined) updateData.email = restaurantBody.email ?? null;
    if (restaurantBody.taxId !== undefined) updateData.taxId = restaurantBody.taxId ?? null;
    if (typeof restaurantBody.currency === 'string') updateData.currency = restaurantBody.currency;
    if (typeof restaurantBody.timezone === 'string') updateData.timezone = restaurantBody.timezone;
    if (restaurantBody.logoUrl !== undefined) updateData.logoUrl = restaurantBody.logoUrl ?? null;
    if (typeof restaurantBody.isActive === 'boolean') updateData.isActive = restaurantBody.isActive;
    if (restaurantBody.settings !== undefined && typeof restaurantBody.settings === 'object') {
      updateData.settings = restaurantBody.settings;
    }

    const [updatedRestaurant] = await Promise.all([
      prisma.restaurant.update({
        where: { id: session.restaurantId },
        data: updateData,
      }),
      prisma.organization.updateMany({
        where: { tenantId: restaurant.tenantId },
        data: {
          company: company ?? null,
          taxId: restaurantBody.taxId ?? null,
          bankName: bankName ?? null,
          bankAccount: bankAccount ?? null,
          directorName: directorName ?? null,
          bankSWIFT: bankSWIFT ?? null,
        },
      }),
    ]);

    const settings =
      updatedRestaurant.settings && typeof updatedRestaurant.settings === 'object'
        ? updatedRestaurant.settings
        : {};

    const organization = await prisma.organization.findFirst({
      where: { tenantId: restaurant.tenantId },
      select: { company: true, taxId: true, address: true, phone: true, email: true, bankName: true, bankAccount: true, directorName: true, bankSWIFT: true },
    });

    return NextResponse.json({
      ...updatedRestaurant,
      settings,
      organization: organization ?? { company: null, taxId: null, address: null, phone: null, email: null, bankName: null, bankAccount: null, directorName: null, bankSWIFT: null },
    });
  } catch (e) {
    if (e instanceof Error && e.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[api/settings/restaurant PUT]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
