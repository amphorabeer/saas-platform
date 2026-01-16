import { NextRequest, NextResponse } from 'next/server'
import { planTransfer } from '@/lib/scheduler/operations'
import { withTenant, RouteContext } from '@/lib/api-middleware'

export const POST = withTenant(async (
  request: NextRequest,
  ctx: RouteContext
) => {
  try {
    const body = await request.json()
    
    // Convert date strings to Date objects
    const input = {
      ...body,
      tenantId: ctx.tenantId,
      createdBy: ctx.userId || 'system',
      plannedAt: new Date(body.plannedAt),
    }

    const result = await planTransfer(input)

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Error planning transfer:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to plan transfer' },
      { status: 400 }
    )
  }
})



