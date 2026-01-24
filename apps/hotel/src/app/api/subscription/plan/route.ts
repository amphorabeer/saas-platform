import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getAuthOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// Force dynamic - არ დაკეშოს
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const authOptions = await getAuthOptions();
    const session = await getServerSession(authOptions);
    const user = session?.user as { tenantId?: string; hotelCode?: string } | undefined;
    
    console.log('[Plan API] Session user:', { tenantId: user?.tenantId, hotelCode: user?.hotelCode });
    
    if (!user?.tenantId && !user?.hotelCode) {
      return NextResponse.json({ plan: 'STARTER', status: 'trial' });
    }

    // Find organization by tenantId or hotelCode
    let organization = null;
    
    if (user.tenantId) {
      organization = await prisma.organization.findFirst({
        where: { tenantId: user.tenantId },
        include: { subscription: true }
      });
    }
    
    if (!organization && user.hotelCode) {
      organization = await prisma.organization.findFirst({
        where: { hotelCode: user.hotelCode },
        include: { subscription: true }
      });
    }

    console.log('[Plan API] Found organization:', !!organization, 'Plan:', organization?.subscription?.plan);

    if (!organization?.subscription) {
      return NextResponse.json({
        plan: 'STARTER',
        status: 'trial',
      });
    }

    return NextResponse.json({
      plan: organization.subscription.plan || 'STARTER',
      status: organization.subscription.status || 'trial',
    });
  } catch (error) {
    console.error('[Plan API] Error:', error);
    return NextResponse.json({ plan: 'STARTER', status: 'trial' });
  }
}