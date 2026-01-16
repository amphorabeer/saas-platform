import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@saas-platform/database'
import { withTenant, RouteContext } from '@/lib/api-middleware'
import { checkTankAvailability } from '@/lib/lot-helpers'

// ═══════════════════════════════════════════════════════════
// GET /api/tanks/availability?tankId=xxx&start=xxx&end=xxx
// ═══════════════════════════════════════════════════════════

export const GET = withTenant(async (req: NextRequest, ctx: RouteContext) => {
  try {
    const url = new URL(req.url)
    const tankId = url.searchParams.get('tankId')
    const start = url.searchParams.get('start')
    const end = url.searchParams.get('end')

    if (!tankId || !start || !end) {
      return NextResponse.json(
        { error: 'tankId, start, end პარამეტრები სავალდებულოა' },
        { status: 400 }
      )
    }

    const result = await checkTankAvailability(tankId, start, end)

    return NextResponse.json(result)

  } catch (error: any) {
    console.error('[TANK_AVAILABILITY] Error:', error.message)
    return NextResponse.json(
      { error: 'შეცდომა', details: error.message },
      { status: 500 }
    )
  }
})

// ═══════════════════════════════════════════════════════════
// POST /api/tanks/availability (batch check)
// ═══════════════════════════════════════════════════════════

export const POST = withTenant(async (req: NextRequest, ctx: RouteContext) => {
  try {
    const body = await req.json()
    const { tankIds, start, end } = body

    if (!tankIds || !Array.isArray(tankIds) || tankIds.length === 0) {
      return NextResponse.json(
        { error: 'tankIds მასივი სავალდებულოა' },
        { status: 400 }
      )
    }

    if (!start || !end) {
      return NextResponse.json(
        { error: 'start და end პარამეტრები სავალდებულოა' },
        { status: 400 }
      )
    }

    const results: Record<string, any> = {}
    let allAvailable = true

    for (const tankId of tankIds) {
      const result = await checkTankAvailability(tankId, start, end)
      results[tankId] = result
      if (!result.available) {
        allAvailable = false
      }
    }

    return NextResponse.json({
      allAvailable,
      results,
    })

  } catch (error: any) {
    console.error('[TANK_AVAILABILITY] Error:', error.message)
    return NextResponse.json(
      { error: 'შეცდომა', details: error.message },
      { status: 500 }
    )
  }
})


