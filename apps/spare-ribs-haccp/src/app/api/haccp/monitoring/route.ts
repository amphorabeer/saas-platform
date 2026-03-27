import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkCCP1, checkCCP2, checkCCP3, checkCCP4 } from '@/types'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { ccpNumber, ...rest } = body

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

  let user = await prisma.user.findFirst()
  if (!user) {
    const bcrypt = await import('bcryptjs')
    user = await prisma.user.create({
      data: { name: 'Demo', email: 'demo@sparerib.ge', password: await bcrypt.hash('demo123', 10) }
    })
  }

  // CCP-1: კგ-ს კლება F-005-დან (პარტია SR-XXXX-P001 → LOT SR-XXXX)
  if (ccpNumber === 'CCP-1' && body.batchLot && body.weightKg) {
    const baseLot = body.batchLot.includes('-P') 
      ? body.batchLot.replace(/-P\d+$/, '') 
      : body.batchLot
    const rawMat = await prisma.rawMaterial.findUnique({
      where: { lotNumber: baseLot }
    })
    if (rawMat) {
      const currentRemaining = rawMat.remainingKg ?? rawMat.weightKg
      const newRemaining = currentRemaining - body.weightKg

      if (newRemaining < 0) {
        return NextResponse.json(
          { error: `LOT ამოიწურა! დარჩენილია ${currentRemaining}კგ, მოთხოვნილია ${body.weightKg}კგ` },
          { status: 400 }
        )
      }

      await prisma.rawMaterial.update({
        where: { lotNumber: body.batchLot },
        data: { remainingKg: newRemaining }
      })
    }
  }

  const log = await prisma.haccpLog.create({
    data: {
      ccpNumber,
      batchLot: body.batchLot || 'UNKNOWN',
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
    include: {
      operator: { select: { name: true } },
      correctiveAction: { select: { reportNum: true, status: true } }
    },
    orderBy: { loggedAt: 'desc' },
    take: limit,
  })

  // correctiveAction relation null-ია თუ logId არ მიუთითებია
  // ამიტომ batchLot-ით ვამოწმებთ
  const batchLots = logs.filter(l => !l.isCompliant && !l.correctiveAction).map(l => l.batchLot)
  let caByLot: Record<string, any> = {}
  if (batchLots.length > 0) {
    const cas = await prisma.correctiveAction.findMany({
      where: { batchLot: { in: batchLots } },
      select: { batchLot: true, reportNum: true, status: true }
    })
    cas.forEach(ca => { if (ca.batchLot) caByLot[ca.batchLot] = ca })
  }

  const result = logs.map(l => ({
    ...l,
    correctiveAction: l.correctiveAction || caByLot[l.batchLot] || null
  }))

  return NextResponse.json(result)
}

export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { id, ccpNumber, notes, ...rest } = body

  let isCompliant = true
  let deviation = null
  let fields: any = {}

  if (ccpNumber === 'CCP-1') {
    const r = checkCCP1(+rest.svTempStart||0, +rest.svTempMid||0, +rest.svTempEnd||0, +rest.svHours||0)
    isCompliant = r.compliant; deviation = r.issues.join(' | ') || null
    fields = { svTempStart: +rest.svTempStart, svTempMid: +rest.svTempMid, svTempEnd: +rest.svTempEnd, svHours: +rest.svHours }
  } else if (ccpNumber === 'CCP-2') {
    const r = checkCCP2(+rest.bcTempFinal||99, +rest.bcDurationMin||999)
    isCompliant = r.compliant; deviation = r.issues.join(' | ') || null
    fields = { bcTempInitial: +rest.bcTempInitial, bcTemp30min: +rest.bcTemp30min, bcTemp60min: +rest.bcTemp60min, bcTempFinal: +rest.bcTempFinal, bcDurationMin: +rest.bcDurationMin }
  } else if (ccpNumber === 'CCP-3') {
    const r = checkCCP3(+rest.fridgeTempAm||0, +rest.fridgeTempPm||0, +rest.freezerTempAm||0, +rest.freezerTempPm||0)
    isCompliant = r.compliant; deviation = r.issues.join(' | ') || null
    fields = { fridgeTempAm: +rest.fridgeTempAm, fridgeTempPm: +rest.fridgeTempPm, freezerTempAm: +rest.freezerTempAm, freezerTempPm: +rest.freezerTempPm }
  } else if (ccpNumber === 'CCP-4') {
    const r = checkCCP4(+rest.cipNaohPct||0, +rest.cipTempC||0, +rest.cipPaaPpm||0, +rest.cipFinalPh||0)
    isCompliant = r.compliant; deviation = r.issues.join(' | ') || null
    fields = { cipEquipment: rest.cipEquipment, cipNaohPct: +rest.cipNaohPct, cipTempC: +rest.cipTempC, cipPaaPpm: +rest.cipPaaPpm, cipFinalPh: +rest.cipFinalPh }
  }

  const updated = await prisma.haccpLog.update({
    where: { id },
    data: { ...fields, notes: notes || null, isCompliant, deviation },
    include: { operator: { select: { name: true } } }
  })

  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  // CCP-1: კგ-ს დაბრუნება F-005-ში
  const log = await prisma.haccpLog.findUnique({ where: { id } })
  if (log?.ccpNumber === 'CCP-1' && log.weightKg && log.batchLot) {
    const baseLot = log.batchLot.includes('-P') 
      ? log.batchLot.replace(/-P\d+$/, '') 
      : log.batchLot
    const rawMat = await prisma.rawMaterial.findUnique({
      where: { lotNumber: baseLot }
    })
    if (rawMat) {
      const currentRemaining = rawMat.remainingKg ?? rawMat.weightKg
      await prisma.rawMaterial.update({
        where: { lotNumber: log.batchLot },
        data: { remainingKg: Math.min(rawMat.weightKg, currentRemaining + log.weightKg) }
      })
    }
  }

  await prisma.haccpLog.delete({ where: { id } })
  return NextResponse.json({ success: true })
}

function buildCcpFields(ccp: string, d: any) {
  if (ccp === 'CCP-1') return { svTempStart: d.svTempStart, svTempMid: d.svTempMid, svTempEnd: d.svTempEnd, svHours: d.svHours }
  if (ccp === 'CCP-2') return { bcTempInitial: d.bcTempInitial, bcTemp30min: d.bcTemp30min, bcTemp60min: d.bcTemp60min, bcTempFinal: d.bcTempFinal, bcDurationMin: d.bcDurationMin }
  if (ccp === 'CCP-3') return { fridgeTempAm: d.fridgeTempAm, fridgeTempPm: d.fridgeTempPm, freezerTempAm: d.freezerTempAm, freezerTempPm: d.freezerTempPm }
  if (ccp === 'CCP-4') return { cipEquipment: d.cipEquipment, cipNaohPct: d.cipNaohPct, cipTempC: d.cipTempC, cipPaaPpm: d.cipPaaPpm, cipFinalPh: d.cipFinalPh }
  return {}
}

export const dynamic = 'force-dynamic'
