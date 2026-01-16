import { NextRequest, NextResponse } from 'next/server'
import { planFermentation } from '@/lib/scheduler/operations'
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
      plannedStart: new Date(body.plannedStart),
      plannedEnd: new Date(body.plannedEnd),
      splitDestinations: body.splitDestinations?.map((d: any) => ({
        ...d,
        plannedStart: new Date(d.plannedStart),
        plannedEnd: new Date(d.plannedEnd),
      })),
    }

    const result = await planFermentation(input)

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Error planning fermentation:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to plan fermentation' },
      { status: 400 }
    )
  }
})



