import { NextRequest, NextResponse } from 'next/server'
import { withPermission, RouteContext } from '@/lib/api-middleware'
import { prisma } from '@saas-platform/database'

// GET /api/audit - Get audit logs (requires settings:read permission)
export const GET = withPermission('settings:read', async (req: NextRequest, ctx: RouteContext) => {
  const { searchParams } = new URL(req.url)
  
  const entityType = searchParams.get('entityType')
  const entityId = searchParams.get('entityId')
  const userId = searchParams.get('userId')
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  const limit = parseInt(searchParams.get('limit') || '100')
  
  const logs = await (prisma as any).auditLog.findMany({
    where: {
      tenantId: ctx.tenantId,
      ...(entityType && { entityType }),
      ...(entityId && { entityId }),
      ...(userId && { userId }),
      ...(startDate && { createdAt: { gte: new Date(startDate) } }),
      ...(endDate && { createdAt: { lte: new Date(endDate) } }),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
  
  return NextResponse.json({ logs })
})









