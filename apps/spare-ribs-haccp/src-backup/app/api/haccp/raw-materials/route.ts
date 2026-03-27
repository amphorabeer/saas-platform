// src/app/api/haccp/raw-materials/route.ts
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
      hasCoa: hasCoa || false,
      hasVetCert: hasVetCert || false,
      vetCertNum: vetCertNum || null,
      visualOk: visualOk !== false,
      isAccepted,
      rejectReason: !isAccepted
        ? [!tempOk && `ტ. ${tempArrival}°C > 4°C`, !hasCoa && 'COA ნ.', !hasVetCert && 'ვ.სერ. ნ.', !visualOk && 'ვ.შ. ვ.ი.'].filter(Boolean).join(', ')
        : null,
      notes: notes || null,
      receivedById: user.id,
    }
  })

  return NextResponse.json({ receipt, isAccepted, issues: [] })
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
