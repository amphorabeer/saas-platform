import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

// Force dynamic - არ დაკეშოს
export const dynamic = 'force-dynamic';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as { tenantId?: string } | undefined;
    
    console.log('[Brewery Plan API] tenantId:', user?.tenantId);
    
    if (!user?.tenantId) {
      return NextResponse.json({ plan: 'STARTER', isActive: true });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: user.tenantId },
      select: {
        id: true,
        name: true,
        plan: true,
        isActive: true,
      },
    });

    console.log('[Brewery Plan API] Found tenant:', !!tenant, 'plan:', tenant?.plan);

    if (!tenant) {
      return NextResponse.json({ plan: 'STARTER', isActive: true });
    }

    return NextResponse.json({
      plan: tenant.plan || 'STARTER',
      tenantName: tenant.name,
      isActive: tenant.isActive ?? true,
    });
  } catch (error) {
    console.error('[Brewery Plan API] Error:', error);
    return NextResponse.json({ plan: 'STARTER', isActive: true });
  }
}