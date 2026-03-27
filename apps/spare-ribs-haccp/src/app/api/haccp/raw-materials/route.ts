import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { lotNumber, supplier, weightKg, tempArrival, hasCoa, hasVetCert, vetCertNum, visualOk, notes } = body

  const tempOk = tempArrival <= 4
  const docsOk = hasCoa && hasVetCert
  const isAccepted = tempOk && docsOk && visualOk

  let user = await prisma.user.findFirst()
  if (!user) {
    const bcrypt = await import('bcryptjs')
    user = await prisma.user.create({
      data: { name: 'Demo', email: 'demo@sparerib.ge', password: await bcrypt.hash('demo123', 10) }
    })
  }

  const receipt = await prisma.rawMaterial.create({
    data: {
      lotNumber: lotNumber || `SR-${Date.now()}`,
      supplier, weightKg, tempArrival,
      remainingKg: weightKg, // დასაწყისში = სულ კგ
      hasCoa: hasCoa || false,
      hasVetCert: hasVetCert || false,
      vetCertNum: vetCertNum || null,
      visualOk: visualOk !== false,
      isAccepted,
      rejectReason: !isAccepted
        ? [!tempOk && `ტ. ${tempArrival}°C > 4°C`, !hasCoa && 'COA ნაკლ.', !hasVetCert && 'ვ.სერ. ნაკლ.'].filter(Boolean).join(', ')
        : null,
      notes: notes || null,
      receivedById: user.id,
    }
  })

  return NextResponse.json({ receipt, isAccepted })
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const limit = parseInt(searchParams.get('limit') || '50')

  const receipts = await prisma.rawMaterial.findMany({
    include: { receivedBy: { select: { name: true } } },
    orderBy: { receivedAt: 'desc' },
    take: limit,
  })

  return NextResponse.json(receipts)
}

export async function PATCH(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const body = await req.json()
  const updated = await prisma.rawMaterial.update({
    where: { id },
    data: {
      supplier: body.supplier,
      weightKg: body.weightKg,
      tempArrival: body.tempArrival,
      notes: body.notes || null,
    }
  })

  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  await prisma.rawMaterial.delete({ where: { id } })
  return NextResponse.json({ success: true })
}

export const dynamic = 'force-dynamic'
