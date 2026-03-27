// src/app/api/haccp/audit/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const body = await req.json()

  let user = await prisma.user.findFirst()
  if (!user) {
    const bcrypt = await import('bcryptjs')
    user = await prisma.user.create({
      data: { name: 'Demo', email: 'demo@sparerib.ge', password: await bcrypt.hash('demo123', 10) }
    })
  }

  const pct = body.percentage
  const rating =
    pct >= 95 ? 'EXCELLENT' :
    pct >= 85 ? 'GOOD' :
    pct >= 70 ? 'FAIR' : 'POOR'

  const num = `AUD-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`

  const audit = await prisma.haccpAudit.create({
    data: {
      auditNum: num,
      auditedById: user.id,
      auditDate: body.auditDate ? new Date(body.auditDate) : new Date(),
      totalScore: body.totalScore,
      maxScore: body.maxScore,
      percentage: pct,
      rating,
      auditedByName: body.auditedByName || null,
      findings: body.findings || null,
      recommendations: body.recommendations || null,
      checklistData: body.checklistData || {},
      nextAuditDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 კვ. / 1 week
    }
  })

  return NextResponse.json(audit)
}

export async function GET(_req: NextRequest) {
  const audits = await prisma.haccpAudit.findMany({
    include: { auditedBy: { select: { name: true } } },
    orderBy: { auditDate: 'desc' },
    take: 20,
  })
  return NextResponse.json(audits)
}

export async function PATCH(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const body = await req.json()
  const pct = body.percentage ?? undefined
  const rating = pct !== undefined
    ? pct >= 95 ? 'EXCELLENT' : pct >= 85 ? 'GOOD' : pct >= 70 ? 'FAIR' : 'POOR'
    : undefined

  const updated = await prisma.haccpAudit.update({
    where: { id },
    data: {
      auditedByName: body.auditedByName ?? undefined,
      checklistData: body.checklistData ?? undefined,
      totalScore: body.totalScore ?? undefined,
      maxScore: body.maxScore ?? undefined,
      percentage: pct,
      ...(rating ? { rating: rating as any } : {}),
    }
  })
  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  await prisma.haccpAudit.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
