import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as { odooOrganizationId?: string } | undefined;
    
    if (!user?.odooOrganizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const subscription = await prisma.subscription.findFirst({
      where: { organizationId: user.odooOrganizationId },
      select: {
        id: true,
        plan: true,
        status: true,
      },
    });

    if (!subscription) {
      // Default to STARTER if no subscription found
      return NextResponse.json({
        plan: 'STARTER',
        status: 'active',
      });
    }

    return NextResponse.json({
      plan: subscription.plan,
      status: subscription.status,
    });
  } catch (error) {
    console.error('Error fetching subscription plan:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
