// src/app/api/haccp/lab-tests/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkLab } from '@/types'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { lotNumber, labName, tvcResult, ecoliResult, salmonella, listeria, staphResult, notes } = body

  const tvcPass    = tvcResult != null   ? tvcResult <= 100_000 : null
  const ecoliPass  = ecoliResult != null ? ecoliResult <= 10    : null
  const salmonellaPass = salmonella != null ? salmonella === false : null
  const listeriaPass   = listeria != null   ? listeria === false   : null

  const checks = [tvcPass, ecoliPass, salmonellaPass, listeriaPass].filter(v => v !== null)
  const overallPass = checks.length > 0 ? checks.every(Boolean) : true

  let user = await prisma.user.findFirst()
  if (!user) {
    const bcrypt = await import('bcryptjs')
    user = await prisma.user.create({
      data: { name: 'Demo', email: 'demo@sparerib.ge', password: await bcrypt.hash('demo123', 10) }
    })
  }

  const test = await prisma.labTest.create({
    data: {
      lotNumber: lotNumber || null,
      labName,
      tvcResult:  tvcResult  ?? null,
      ecoliResult: ecoliResult ?? null,
      salmonella:  salmonella  ?? null,
      listeria:    listeria    ?? null,
      staphResult: staphResult ?? null,
      tvcPass, ecoliPass, salmonellaPass, listeriaPass,
      overallPass,
      notes: notes || null,
      testedById: user.id,
    }
  })

  const requiresRecall = salmonella === true || listeria === true

  // სიგნ. / Auto-signal: production recall needed
  if (requiresRecall) {
    console.error(`🚨 RECALL TRIGGERED [${lotNumber}]: ${salmonella ? 'Salmonella' : ''} ${listeria ? 'Listeria' : ''}`)
    // TODO: push notification / email / create auto F-006
  }

  return NextResponse.json({ test, overallPass, requiresRecall })
}

export async function GET(_req: NextRequest) {
  const tests = await prisma.labTest.findMany({
    include: { testedBy: { select: { name: true } } },
    orderBy: { testedAt: 'desc' },
    take: 50,
  })
  return NextResponse.json(tests)
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  await prisma.labTest.delete({ where: { id } })
  return NextResponse.json({ success: true })
}

export async function PATCH(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const body = await req.json()
  const overallPass = 
    (body.tvcResult == null || body.tvcResult <= 100000) &&
    (body.ecoliResult == null || body.ecoliResult <= 10) &&
    body.salmonella !== true &&
    body.listeria !== true

  const updated = await prisma.labTest.update({
    where: { id },
    data: {
      tvcResult: body.tvcResult ?? null,
      ecoliResult: body.ecoliResult ?? null,
      salmonella: body.salmonella ?? null,
      listeria: body.listeria ?? null,
      notes: body.notes || null,
      overallPass,
    }
  })
  return NextResponse.json(updated)
}

export const dynamic = 'force-dynamic'
