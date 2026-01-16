import { NextRequest, NextResponse } from 'next/server'
import { getBlockDetail } from '@/lib/scheduler/calendar'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const assignmentId = params.id

    if (!assignmentId) {
      return NextResponse.json(
        { error: 'Missing assignment ID' },
        { status: 400 }
      )
    }

    const detail = await getBlockDetail(assignmentId)

    if (!detail) {
      return NextResponse.json(
        { error: 'Block not found' },
        { status: 404 }
      )
    }

    // Serialize dates
    const serialized = {
      ...detail,
      block: {
        ...detail.block,
        startDate: detail.block.startDate.toISOString(),
        endDate: detail.block.endDate.toISOString(),
      },
      lot: {
        ...detail.lot,
        createdAt: detail.lot.createdAt.toISOString(),
        completedAt: detail.lot.completedAt?.toISOString(),
      },
      batches: detail.batches.map(b => ({
        ...b,
        brewDate: b.brewDate?.toISOString() || new Date().toISOString(),
      })),
      transfers: detail.transfers.map(t => ({
        ...t,
        executedAt: t.executedAt?.toISOString(),
      })),
      latestReadings: detail.latestReadings.map(r => ({
        ...r,
        recordedAt: r.recordedAt.toISOString(),
      })),
    }

    return NextResponse.json(serialized)
  } catch (error) {
    console.error('Error getting block detail:', error)
    return NextResponse.json(
      { error: 'Failed to get block detail' },
      { status: 500 }
    )
  }
}



