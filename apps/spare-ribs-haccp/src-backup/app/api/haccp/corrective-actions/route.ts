// src/app/api/haccp/corrective-actions/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { genCar } from '@/types'

export async function POST(req: NextRequest) {
  const body = await req.json()

  let user = await prisma.user.findFirst()
  if (!user) {
    const bcrypt = await import('bcryptjs')
    user = await prisma.user.create({
      data: { name: 'Demo', email: 'demo@sparerib.ge', password: await bcrypt.hash('demo123', 10) }
    })
  }

  const ca = await prisma.correctiveAction.create({
    data: {
      reportNum:   body.reportNum || genCar(),
      logId:       body.logId    || null,
      batchLot:    body.batchLot || null,
      ccpRef:      body.ccpRef   || null,
      deviation:   body.deviation,
      rootCause:   body.rootCause  || null,
      action:      body.action,
      preventive:  body.preventive || null,
      isBatchHold: body.isBatchHold || false,
      isDisposed:  body.isDisposed  || false,
      disposedKg:  body.disposedKg  || null,
      deadline:    body.deadline ? new Date(body.deadline) : null,
      responsible: body.responsible,
      operatorId:  user.id,
      status:      'OPEN',
    }
  })

  return NextResponse.json(ca)
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')

  const cas = await prisma.correctiveAction.findMany({
    where: status ? { status: status as any } : {},
    include: { operator: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  return NextResponse.json(cas)
}

export async function PATCH(req: NextRequest) {
  const { id, status, rootCause, action, preventive } = await req.json()

  const updated = await prisma.correctiveAction.update({
    where: { id },
    data: {
      status,
      rootCause,
      action,
      preventive,
      closedAt: status === 'CLOSED' ? new Date() : null,
    }
  })

  return NextResponse.json(updated)
}
