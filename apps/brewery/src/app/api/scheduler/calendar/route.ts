import { NextRequest, NextResponse } from 'next/server'
import { generateCalendarData } from '@/lib/scheduler/calendar'
import { withTenant, RouteContext } from '@/lib/api-middleware'

export const GET = withTenant(async (
  request: NextRequest,
  ctx: RouteContext
) => {
  try {
    console.log('[CALENDAR API] Starting request...')
    console.log('[CALENDAR API] Tenant ID:', ctx.tenantId)
    
    // Check Prisma client
    const { prisma } = await import('@saas-platform/database')
    console.log('[CALENDAR API] Prisma client type:', typeof prisma)
    console.log('[CALENDAR API] Prisma models:', Object.keys(prisma).filter(k => !k.startsWith('_') && !k.startsWith('$')).slice(0, 20))
    console.log('[CALENDAR API] TankAssignment exists:', 'tankAssignment' in prisma)
    console.log('[CALENDAR API] Lot exists:', 'lot' in prisma)
    
    const searchParams = request.nextUrl.searchParams
    const start = searchParams.get('start')
    const end = searchParams.get('end')

    console.log('[CALENDAR API] Start:', start)
    console.log('[CALENDAR API] End:', end)

    if (!start || !end) {
      return NextResponse.json(
        { error: 'Missing required parameters: start, end' },
        { status: 400 }
      )
    }

    const timeRange = {
      start: new Date(start),
      end: new Date(end),
    }

    console.log('[CALENDAR API] Calling generateCalendarData...')
    const data = await generateCalendarData(ctx.tenantId, timeRange)
    console.log('[CALENDAR API] Generated data rows:', data.rows?.length || 0)

    // Convert Dates to ISO strings for JSON serialization
    const serialized = {
      ...data,
      timeRange: {
        start: data.timeRange.start.toISOString(),
        end: data.timeRange.end.toISOString(),
      },
      rows: data.rows.map(row => ({
        ...row,
        blocks: row.blocks.map(block => ({
          ...block,
          startDate: block.startDate.toISOString(),
          endDate: block.endDate.toISOString(),
        })),
      })),
    }

    console.log('[CALENDAR API] Success, returning data')
    return NextResponse.json(serialized)
  } catch (error) {
    console.error('[CALENDAR API] Error:', error)
    console.error('[CALENDAR API] Error stack:', error instanceof Error ? error.stack : 'No stack')
    console.error('[CALENDAR API] Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)))
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
})

