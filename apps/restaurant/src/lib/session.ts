import { getServerSession } from 'next-auth';
import { getToken } from 'next-auth/jwt';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export type RestaurantSession = {
  userId: string;
  email: string;
  name: string;
  role: string;
  tenantId: string;
  organizationId: string;
  restaurantId: string;
  employeeId: string;
  employeeRole: string;
  restCode: string;
};

/**
 * Get restaurant session from the current context (getServerSession).
 * Use in Server Components. In API Route Handlers prefer getRestaurantSessionFromRequest(request).
 */
export async function getRestaurantSession(): Promise<RestaurantSession | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[session] getRestaurantSession: getServerSession returned no user');
    }
    return null;
  }
  const u = session.user as {
    id?: string;
    email?: string;
    name?: string;
    role?: string;
    tenantId?: string;
    organizationId?: string;
    restaurantId?: string;
    employeeId?: string;
    employeeRole?: string;
    restCode?: string;
  };
  if (!u.restaurantId) {
    console.warn('[session] getRestaurantSession: restaurantId is missing. User may need to re-login.', {
      userId: u.id,
    });
    return null;
  }
  return {
    userId: u.id ?? '',
    email: u.email ?? '',
    name: u.name ?? '',
    role: u.role ?? 'USER',
    tenantId: u.tenantId ?? '',
    organizationId: u.organizationId ?? '',
    restaurantId: u.restaurantId,
    employeeId: u.employeeId ?? '',
    employeeRole: u.employeeRole ?? '',
    restCode: u.restCode ?? '',
  };
}

/**
 * Get restaurant session from the incoming Request (e.g. API Route Handler).
 * Uses JWT from cookie via getToken – reliable in App Router API routes.
 * Ensure NEXTAUTH_SECRET is set in .env.local (e.g. store-pos-secret-key-2026-geobiz).
 */
export async function getRestaurantSessionFromRequest(
  request: Request
): Promise<RestaurantSession | null> {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    console.error('[session] NEXTAUTH_SECRET is not set. Session will not work.');
    return null;
  }
  const token = await getToken({ req: request, secret });
  if (!token || !token.restaurantId) {
    if (process.env.NODE_ENV === 'development' && !token) {
      console.warn('[session] getRestaurantSessionFromRequest: getToken returned null (no valid JWT). Check NEXTAUTH_SECRET and cookie.');
    }
    return null;
  }
  return {
    userId: (token.id as string) ?? (token.sub ?? ''),
    email: (token.email as string) ?? '',
    name: (token.name as string) ?? '',
    role: (token.role as string) ?? 'USER',
    tenantId: (token.tenantId as string) ?? '',
    organizationId: (token.organizationId as string) ?? '',
    restaurantId: token.restaurantId as string,
    employeeId: (token.employeeId as string) ?? '',
    employeeRole: (token.employeeRole as string) ?? '',
    restCode: (token.restCode as string) ?? '',
  };
}

/**
 * Require restaurant session (throws if missing).
 * For API routes, use requireRestaurantSessionFromRequest(request) and return 401 in catch.
 */
export async function requireRestaurantSession(): Promise<RestaurantSession> {
  const session = await getRestaurantSession();
  if (!session) {
    throw new Error('Unauthorized');
  }
  return session;
}

/**
 * Require restaurant session from Request. Use in API Route Handlers.
 * Returns session or null; check and return 401 with proper body if null.
 */
export async function requireRestaurantSessionFromRequest(
  request: Request
): Promise<RestaurantSession> {
  console.log('SESSION DEBUG - checking session...');
  const session = await getRestaurantSessionFromRequest(request);
  if (!session) {
    throw new Error('Unauthorized');
  }
  return session;
}

export async function getRestaurant(restaurantId: string) {
  return prisma.restaurant.findUnique({
    where: { id: restaurantId },
  });
}
