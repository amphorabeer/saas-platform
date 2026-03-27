// src/app/api/haccp/monitoring/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkCCP1, checkCCP2, checkCCP3, checkCCP4 } from '@/types'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { ccpNumber, operatorId = 'demo', ...rest } = body

  let isCompliant = true
  let deviation = null

  if (ccpNumber === 'CCP-1') {
    const r = checkCCP1(rest.svTempStart||0, rest.svTempMid||0, rest.svTempEnd||0, rest.svHours||0)
    isCompliant = r.compliant; deviation = r.issues.join(' | ') || null
  } else if (ccpNumber === 'CCP-2') {
    const r = checkCCP2(rest.bcTempFinal||99, rest.bcDurationMin||999)
    isCompliant = r.compliant; deviation = r.issues.join(' | ') || null
  } else if (ccpNumber === 'CCP-3') {
    const r = checkCCP3(rest.fridgeTempAm||99, rest.fridgeTempPm||99, rest.freezerTempAm||0, rest.freezerTempPm||0)
    isCompliant = r.compliant; deviation = r.issues.join(' | ') || null
  } else if (ccpNumber === 'CCP-4') {
    const r = checkCCP4(rest.cipNaohPct||0, rest.cipTempC||0, rest.cipPaaPpm||0, rest.cipFinalPh||0)
    isCompliant = r.compliant; deviation = r.issues.join(' | ') || null
  }

  // Find or create demo user
  let user = await prisma.user.findFirst()
  if (!user) {
    const bcrypt = await import('bcryptjs')
    user = await prisma.user.create({
      data: { name: 'Demo', email: 'demo@sparerib.ge', password: await bcrypt.hash('demo123', 10) }
    })
  }

  const log = await prisma.haccpLog.create({
    data: {
      ccpNumber, batchLot: body.batchLot || 'UNKNOWN',
      weightKg: body.weightKg || null,
      isCompliant, deviation,
      notes: body.notes || null,
      operatorId: user.id,
      ...buildCcpFields(ccpNumber, rest),
    }
  })

  return NextResponse.json({ log, isCompliant, deviation })
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const ccp = searchParams.get('ccp')
  const limit = parseInt(searchParams.get('limit') || '50')

  const logs = await prisma.haccpLog.findMany({
    where: ccp ? { ccpNumber: ccp } : {},
    include: { operator: { select: { name: true } }, correctiveAction: { select: { reportNum: true, status: true } } },
    orderBy: { loggedAt: 'desc' },
    take: limit,
  })

  return NextResponse.json(logs)
}

function buildCcpFields(ccp: string, d: any) {
  if (ccp === 'CCP-1') return { svTempStart: d.svTempStart, svTempMid: d.svTempMid, svTempEnd: d.svTempEnd, svHours: d.svHours }
  if (ccp === 'CCP-2') return { bcTempInitial: d.bcTempInitial, bcTemp30min: d.bcTemp30min, bcTemp60min: d.bcTemp60min, bcTempFinal: d.bcTempFinal, bcDurationMin: d.bcDurationMin }
  if (ccp === 'CCP-3') return { fridgeTempAm: d.fridgeTempAm, fridgeTempPm: d.fridgeTempPm, freezerTempAm: d.freezerTempAm, freezerTempPm: d.freezerTempPm }
  if (ccp === 'CCP-4') return { cipEquipment: d.cipEquipment, cipNaohPct: d.cipNaohPct, cipTempC: d.cipTempC, cipPaaPpm: d.cipPaaPpm, cipFinalPh: d.cipFinalPh }
  return {}
}
