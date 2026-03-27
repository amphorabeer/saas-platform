// src/app/api/haccp/stats/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const ago30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const [
    logsToday,
    devsToday,
    openCa,
    total30,
    compliant30,
    lastLab,
    recentLogs,
  ] = await Promise.all([
    prisma.haccpLog.count({ where: { loggedAt: { gte: today, lt: tomorrow } } }),
    prisma.haccpLog.count({ where: { isCompliant: false, loggedAt: { gte: today, lt: tomorrow } } }),
    prisma.correctiveAction.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
    prisma.haccpLog.count({ where: { loggedAt: { gte: ago30 } } }),
    prisma.haccpLog.count({ where: { isCompliant: true, loggedAt: { gte: ago30 } } }),
    prisma.labTest.findFirst({ orderBy: { testedAt: 'desc' }, select: { testedAt: true, overallPass: true } }),
    prisma.haccpLog.findMany({
      orderBy: { loggedAt: 'desc' },
      take: 10,
      include: { operator: { select: { name: true } } },
    }),
  ])

  const batchesOnHold = await prisma.correctiveAction.count({
    where: { isBatchHold: true, status: { not: 'CLOSED' } }
  })

  // CCP breakdown (30 days)
  const ccpNums = ['CCP-1', 'CCP-2', 'CCP-3', 'CCP-4']
  const ccpBreakdown = await Promise.all(
    ccpNums.map(async ccp => {
      const total = await prisma.haccpLog.count({ where: { ccpNumber: ccp, loggedAt: { gte: ago30 } } })
      const comp  = await prisma.haccpLog.count({ where: { ccpNumber: ccp, isCompliant: true, loggedAt: { gte: ago30 } } })
      return { ccp, total, compliant: comp, rate: total > 0 ? Math.round((comp / total) * 1000) / 10 : 100 }
    })
  )

  return NextResponse.json({
    logsToday,
    devsToday,
    openCa,
    batchesOnHold,
    complianceRate: total30 > 0 ? Math.round((compliant30 / total30) * 1000) / 10 : 100,
    lastLabTest: lastLab?.testedAt || null,
    lastLabPass: lastLab?.overallPass ?? null,
    ccpBreakdown,
    recentLogs: recentLogs.map(l => ({
      id: l.id,
      ccpNumber: l.ccpNumber,
      batchLot: l.batchLot,
      isCompliant: l.isCompliant,
      deviation: l.deviation,
      operator: l.operator.name,
      loggedAt: l.loggedAt,
    })),
  })
}
