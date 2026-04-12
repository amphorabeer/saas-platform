import { NextRequest, NextResponse } from 'next/server'
import type { HaccpJournalType, SopType } from '@prisma/client'
import { prisma } from '@saas-platform/database'
import { withTenantAuth, type RouteContext } from '../withTenantAuth'

export const dynamic = 'force-dynamic'

function startOfDay() {
  const d = new Date(); d.setHours(0,0,0,0); return d
}
function daysAgo(n: number) {
  const d = new Date(); d.setDate(d.getDate()-n); d.setHours(0,0,0,0); return d
}
function daysSinceDate(date: Date | null): number | null {
  if (!date) return null
  return Math.floor((Date.now() - date.getTime()) / 86400000)
}

type AlertLevel = 'critical' | 'warning' | 'info'
interface Alert {
  level: AlertLevel
  type: string
  message: string
  lastDate: string | null
  daysSince: number | null
}

export const GET = withTenantAuth(async (_req: NextRequest, ctx: RouteContext) => {
  const alerts: Alert[] = []

  try {
    const today = startOfDay()
    const tid = ctx.tenantId

    // Helper to get last journal entry
    async function lastJournal(type: HaccpJournalType) {
      return prisma.haccpJournal.findFirst({
        where: { tenantId: tid, type },
        orderBy: { recordedAt: 'desc' },
        select: { recordedAt: true, data: true },
      })
    }

    // 1. SOP completions today
    try {
      const sopDone = await prisma.sopCompletion.findMany({
        where: { tenantId: tid, completedAt: { gte: today } },
        select: { sopType: true },
      })
      const doneSopTypes = new Set(sopDone.map(s => s.sopType))
      const DAILY_SOPS: { key: SopType; label: string }[] = [
        { key: 'CLEANING', label: 'რეცხვა-დეზინფექცია' },
        { key: 'PERSONNEL_HYGIENE', label: 'პერსონალის ჰიგიენა' },
        { key: 'WASTE', label: 'ნარჩენები' },
      ]
      for (const sop of DAILY_SOPS) {
        if (!doneSopTypes.has(sop.key)) {
          const last = await prisma.sopCompletion.findFirst({
            where: { tenantId: tid, sopType: sop.key },
            orderBy: { completedAt: 'desc' },
            select: { completedAt: true },
          })
          const ds = daysSinceDate(last?.completedAt ?? null)
          alerts.push({
            level: ds !== null && ds > 1 ? 'critical' : 'warning',
            type: 'SOP_' + sop.key,
            message: `SOP "${sop.label}" დღეს არ შესრულებულა${ds !== null ? ` (ბოლო: ${ds} დღის წინ)` : ' (არასოდეს)'}`,
            lastDate: last?.completedAt?.toISOString() ?? null,
            daysSince: ds,
          })
        }
      }
    } catch (e) {
      console.error('[alerts] SOP check error:', e)
    }

    // 2. SANITATION — daily
    try {
      const last = await lastJournal('SANITATION')
      if (!last || last.recordedAt < today) {
        const ds = daysSinceDate(last?.recordedAt ?? null)
        alerts.push({
          level: ds !== null && ds > 2 ? 'critical' : 'warning',
          type: 'SANITATION',
          message: `სანიტაცია დღეს არ ჩატარებულა${ds ? ` (ბოლო: ${ds} დღის წინ)` : ''}`,
          lastDate: last?.recordedAt?.toISOString() ?? null,
          daysSince: ds,
        })
      }
    } catch (e) { console.error('[alerts] SANITATION error:', e) }

    // 3. TEMPERATURE — last 12h
    try {
      const last12h = new Date(Date.now() - 12 * 3600 * 1000)
      const last = await prisma.haccpJournal.findFirst({
        where: { tenantId: tid, type: 'TEMPERATURE', recordedAt: { gte: last12h } },
        orderBy: { recordedAt: 'desc' },
        select: { recordedAt: true, data: true },
      })
      if (!last) {
        alerts.push({
          level: 'warning',
          type: 'TEMPERATURE',
          message: 'ტემპერატურა 12+ საათია არ გაზომილა',
          lastDate: null,
          daysSince: null,
        })
      } else {
        const d = last.data as Record<string, unknown>
        const temp = d.temperature != null ? Number(d.temperature) : null
        const area = String(d.area || '')
        if (temp !== null) {
          let tMin = 16, tMax = 22
          if (area.includes('საფერმ')) { tMin = 18; tMax = 24 }
          if (area.includes('კონდიც')) { tMin = 0; tMax = 4 }
          if (area.includes('საწყობი (გამ')) { tMin = 2; tMax = 6 }
          if (d.source === 'auto') { tMin = 0; tMax = 22 }
          if (temp < tMin || temp > tMax) {
            alerts.push({
              level: 'critical',
              type: 'TEMPERATURE_RANGE',
              message: `🌡️ ${area || 'ავზი'}: ${temp}°C — ნორმიდან გადახრა! (ნორმა: ${tMin}–${tMax}°C)`,
              lastDate: last.recordedAt.toISOString(),
              daysSince: 0,
            })
          }
        }
      }
    } catch (e) { console.error('[alerts] TEMPERATURE error:', e) }

    // 4. PEST_CONTROL — weekly
    try {
      const last = await lastJournal('PEST_CONTROL')
      if (!last || last.recordedAt < daysAgo(7)) {
        const ds = daysSinceDate(last?.recordedAt ?? null)
        alerts.push({
          level: ds !== null && ds > 14 ? 'critical' : 'warning',
          type: 'PEST_CONTROL',
          message: `მავნებლების კონტ. ${ds !== null ? `${ds} დღეა` : 'არასოდეს'} არ ჩატარებულა`,
          lastDate: last?.recordedAt?.toISOString() ?? null,
          daysSince: ds,
        })
      }
    } catch (e) { console.error('[alerts] PEST_CONTROL error:', e) }

    // 5. THERMOMETER_CALIBRATION — monthly
    try {
      const last = await lastJournal('THERMOMETER_CALIBRATION')
      if (!last || last.recordedAt < daysAgo(30)) {
        const ds = daysSinceDate(last?.recordedAt ?? null)
        alerts.push({
          level: 'warning',
          type: 'THERMOMETER_CALIBRATION',
          message: `თერმომეტრის კალიბრაცია ${ds !== null ? `${ds} დღეა` : 'არასოდეს'} არ ჩატარებულა`,
          lastDate: last?.recordedAt?.toISOString() ?? null,
          daysSince: ds,
        })
      }
    } catch (e) { console.error('[alerts] THERMOMETER error:', e) }

    // 6. HEALTH_CHECK — daily
    try {
      const last = await lastJournal('HEALTH_CHECK')
      if (!last || last.recordedAt < today) {
        const ds = daysSinceDate(last?.recordedAt ?? null)
        alerts.push({
          level: 'info',
          type: 'HEALTH_CHECK',
          message: `პერსონალის ჯანმრთელობის შემოწმება დღეს არ ჩატარებულა${ds ? ` (ბოლო: ${ds} დღის წინ)` : ''}`,
          lastDate: last?.recordedAt?.toISOString() ?? null,
          daysSince: ds,
        })
      }
    } catch (e) { console.error('[alerts] HEALTH_CHECK error:', e) }

    // 7. INCOMING_CONTROL — only alert if purchase happened without journal
    try {
      const recentPurchases = await prisma.inventoryLedger.count({
        where: { tenantId: tid, type: 'PURCHASE', createdAt: { gte: daysAgo(7) } },
      })
      if (recentPurchases > 0) {
        const recentJournals = await prisma.haccpJournal.count({
          where: { tenantId: tid, type: 'INCOMING_CONTROL', recordedAt: { gte: daysAgo(7) } },
        })
        if (recentJournals === 0) {
          alerts.push({
            level: 'warning',
            type: 'INCOMING_CONTROL',
            message: `ბოლო 7 დღეში ${recentPurchases} შეყიდვა მოხდა — შემავალი კონტროლი არ ჩატარებულა`,
            lastDate: null,
            daysSince: null,
          })
        }
      }
    } catch (e) { console.error('[alerts] INCOMING_CONTROL error:', e) }

    // 8. JOURNAL_VERIFICATION — weekly
    try {
      const last = await lastJournal('JOURNAL_VERIFICATION')
      if (!last || last.recordedAt < daysAgo(7)) {
        const ds = daysSinceDate(last?.recordedAt ?? null)
        alerts.push({
          level: ds !== null && ds > 14 ? 'critical' : 'warning',
          type: 'JOURNAL_VERIFICATION',
          message: `ჟურნალების გადამოწმება ${ds !== null ? `${ds} დღეა` : 'არასოდეს'} არ ჩატარებულა`,
          lastDate: last?.recordedAt?.toISOString() ?? null,
          daysSince: ds,
        })
      }
    } catch (e) { console.error('[alerts] JOURNAL_VERIFICATION error:', e) }

    // Sort: critical → warning → info
    const order: Record<AlertLevel, number> = { critical: 0, warning: 1, info: 2 }
    alerts.sort((a, b) => order[a.level] - order[b.level])

    return NextResponse.json({
      alerts,
      counts: {
        critical: alerts.filter(a => a.level === 'critical').length,
        warning: alerts.filter(a => a.level === 'warning').length,
        info: alerts.filter(a => a.level === 'info').length,
      },
    })
  } catch (error) {
    console.error('[GET /api/haccp/alerts]', error)
    return NextResponse.json({
      alerts: [],
      counts: { critical: 0, warning: 0, info: 0 },
      error: String(error),
    }, { status: 200 }) // Return 200 even on error so dashboard doesn't break
  }
})
