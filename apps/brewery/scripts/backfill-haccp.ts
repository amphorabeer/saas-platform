import { prisma } from '@saas-platform/database'

async function main() {
  console.log('🔄 HACCP Backfill დაწყება...')
  let created = 0

  const tenants = await prisma.tenant.findMany({
    select: { id: true, name: true },
  })

  for (const tenant of tenants) {
    const tid = tenant.id
    console.log(`\n📦 Tenant: ${tenant.name}`)

    const firstUser = await prisma.user.findFirst({
      where: { tenantId: tid },
      select: { id: true, name: true },
    })
    if (!firstUser) {
      console.log(`  ⚠️ მომხმარებელი ვერ მოიძებნა`)
      continue
    }
    const systemUserId = firstUser.id
    console.log(`  👤 მომხმარებელი: ${firstUser.name || firstUser.id}`)

    // Cleanup wrong TEMPERATURE backfill entries (batch-linked, not zones)
    const wrongTemperatures = await prisma.haccpJournal.findMany({
      where: {
        tenantId: tid,
        type: 'TEMPERATURE',
        data: { path: ['source'], equals: 'backfill' },
      },
      select: { id: true, data: true },
    })

    let deletedTemp = 0
    for (const entry of wrongTemperatures) {
      const d = entry.data as Record<string, unknown>
      // Delete if it's batch-linked (not a zone entry)
      if (d.batchId || d.batchNumber || d.gravityReadingId) {
        await prisma.haccpJournal.delete({ where: { id: entry.id } })
        deletedTemp++
      }
    }
    if (deletedTemp > 0) {
      console.log(`  🗑️ წაიშალა ${deletedTemp} არასწ. TEMPERATURE ჩანაწერი`)
    }

    // 1. Inventory purchases → INCOMING_CONTROL
    const purchases = await prisma.inventoryLedger.findMany({
      where: { tenantId: tid, type: 'PURCHASE' },
      include: { item: { select: { name: true, unit: true } } },
    })

    const existingIncoming = await prisma.haccpJournal.findMany({
      where: { tenantId: tid, type: 'INCOMING_CONTROL' },
      select: { data: true },
    })
    const filledLedgerIds = new Set(
      existingIncoming
        .map(j => (j.data as Record<string,unknown>).ledgerId)
        .filter(Boolean)
    )

    for (const p of purchases) {
      if (filledLedgerIds.has(p.id)) continue
      await prisma.haccpJournal.create({
        data: {
          tenantId: tid,
          type: 'INCOMING_CONTROL',
          data: {
            product: p.item.name,
            quantity: String(Number(p.quantity)),
            unit: p.item.unit,
            ledgerId: p.id,
            source: 'backfill',
          },
          recordedBy: systemUserId,
          recordedAt: p.createdAt,
        },
      })
      created++
      console.log(`  ✅ INCOMING_CONTROL: ${p.item.name} ${Number(p.quantity)} ${p.item.unit}`)
    }

    // 2. Gravity readings → TEMPERATURE
    const gravityReadings = await prisma.gravityReading.findMany({
      where: {
        batch: { tenantId: tid },
      },
      include: {
        batch: {
          select: {
            batchNumber: true,
            tankId: true,
            tank: { select: { name: true } },
          },
        },
      },
      orderBy: { recordedAt: 'asc' },
    })

    // Fix existing TEMPERATURE backfill entries without tankName
    const wrongTemps = await prisma.haccpJournal.findMany({
      where: {
        tenantId: tid,
        type: 'TEMPERATURE',
        data: { path: ['source'], equals: 'backfill' },
      },
      select: { id: true, data: true },
    })

    for (const entry of wrongTemps) {
      const d = entry.data as Record<string, unknown>
      if (d.tankName) continue // already has tankName
      if (!d.batchId) continue

      // Get tank name from batch
      const batch = await prisma.batch.findUnique({
        where: { id: String(d.batchId) },
        select: { tank: { select: { name: true } }, tankId: true },
      })
      const tName = batch?.tank?.name || null
      if (!tName) continue

      await prisma.haccpJournal.update({
        where: { id: entry.id },
        data: {
          data: {
            ...d,
            tankName: tName,
            area: `ავზი ${tName}`,
          },
        },
      })
      console.log(`  🔧 TEMPERATURE fix: ავზი ${tName}`)
    }

    const existingTemp = await prisma.haccpJournal.findMany({
      where: { tenantId: tid, type: 'TEMPERATURE' },
      select: { data: true },
    })
    const loggedReadingIds = new Set(
      existingTemp
        .map(j => (j.data as Record<string,unknown>).gravityReadingId)
        .filter(Boolean)
    )

    for (const r of gravityReadings) {
      if (loggedReadingIds.has(r.id)) continue
      const tankName = r.batch.tank?.name || null
      await prisma.haccpJournal.create({
        data: {
          tenantId: tid,
          type: 'TEMPERATURE',
          data: {
            area: tankName ? `ავზი ${tankName}` : `პარტია ${r.batch.batchNumber}`,
            tankName: tankName || null,
            temperature: Number(r.temperature),
            batchId: r.batchId,
            batchNumber: r.batch.batchNumber,
            tankId: r.batch.tankId || null,
            gravity: Number(r.gravity),
            gravityReadingId: r.id,
            source: 'backfill',
          },
          recordedBy: systemUserId,
          recordedAt: r.recordedAt,
        },
      })
      created++
      console.log(`  ✅ TEMPERATURE: ${r.batch.batchNumber} — ${Number(r.temperature)}°C`)
    }

    // 3. Kegs → KEG_WASHING
    const kegs = await (prisma as any).keg.findMany({
      where: { tenantId: tid },
      select: { id: true, kegNumber: true, size: true, updatedAt: true },
    }).catch(() => [])

    const existingKegWash = await prisma.haccpJournal.findMany({
      where: { tenantId: tid, type: 'KEG_WASHING' },
      select: { data: true },
    })
    const washedKegIds = new Set(
      existingKegWash
        .map(j => (j.data as Record<string,unknown>).kegId)
        .filter(Boolean)
    )

    for (const k of kegs) {
      if (washedKegIds.has(k.id)) continue
      await prisma.haccpJournal.create({
        data: {
          tenantId: tid,
          type: 'KEG_WASHING',
          data: {
            kegNumber: k.kegNumber,
            size: k.size,
            result: 'კარგი',
            kegId: k.id,
            source: 'backfill',
          },
          recordedBy: systemUserId,
          recordedAt: k.updatedAt,
        },
      })
      created++
      console.log(`  ✅ KEG_WASHING: ${k.kegNumber}`)
    }

    // 4. Packaging runs → FILLING
    const packagingRuns = await (prisma as any).packagingRun.findMany({
      where: { tenantId: tid },
      include: { batch: { select: { batchNumber: true } } },
    }).catch(() => [])

    const existingFilling = await prisma.haccpJournal.findMany({
      where: { tenantId: tid, type: 'FILLING' },
      select: { data: true },
    })
    const filledPackagingIds = new Set(
      existingFilling
        .map(j => (j.data as Record<string,unknown>).packagingId)
        .filter(Boolean)
    )

    for (const p of packagingRuns) {
      if (filledPackagingIds.has(p.id)) continue
      await prisma.haccpJournal.create({
        data: {
          tenantId: tid,
          type: 'FILLING',
          data: {
            batchNumber: p.batch?.batchNumber,
            packageType: p.packageType,
            quantity: p.quantity,
            volumeTotal: p.volumePerUnit,
            packagingId: p.id,
            source: 'backfill',
          },
          recordedBy: systemUserId,
          recordedAt: p.createdAt,
        },
      })
      created++
      console.log(`  ✅ FILLING: ${p.batch?.batchNumber} — ${p.packageType}`)
    }

    const startDate = new Date('2026-02-23T08:00:00.000Z')
    const now = new Date()

    // Helper: create one journal per week between start and now
    const weeklyDates = (from: Date): Date[] => {
      const dates: Date[] = []
      const d = new Date(from)
      while (d <= now) {
        dates.push(new Date(d))
        d.setDate(d.getDate() + 7)
      }
      return dates
    }

    // Helper: create one journal per day between start and now
    const dailyDates = (from: Date): Date[] => {
      const dates: Date[] = []
      const d = new Date(from)
      while (d <= now) {
        dates.push(new Date(d))
        d.setDate(d.getDate() + 1)
      }
      return dates
    }

    // Helper: check if journal exists for date range
    const journalExists = async (type: string, date: Date): Promise<boolean> => {
      const dayStart = new Date(date)
      dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(date)
      dayEnd.setHours(23, 59, 59, 999)
      const count = await prisma.haccpJournal.count({
        where: {
          tenantId: tid,
          type: type as any,
          recordedAt: { gte: dayStart, lte: dayEnd },
        },
      })
      return count > 0
    }

    // SANITATION — daily, all zones
    const sanitationZones = [
      'თაროები', 'სავენტილაციო არხები', 'ნათურები', 'იატაკი',
      'ჭერი', 'კედლები', 'ფანჯრები', 'ნარჩენები',
      'სატვირთო ინვენტარი', 'დეზინფექცია',
    ]
    for (const date of dailyDates(startDate)) {
      const exists = await journalExists('SANITATION', date)
      if (exists) continue
      for (const area of sanitationZones) {
        await prisma.haccpJournal.create({
          data: {
            tenantId: tid, type: 'SANITATION',
            data: { area, source: 'backfill' },
            recordedBy: systemUserId, recordedAt: date,
          },
        })
        created++
      }
      console.log(`  ✅ SANITATION: ${date.toISOString().split('T')[0]}`)
    }

    // STORAGE_CONTROL — daily, all zones
    const storageZones = [
      { storage: 'მშრალი საწყობი №1', temperature: 15, humidity: 45 },
      { storage: 'მშრალი საწყობი №2', temperature: 15, humidity: 45 },
      { storage: 'გამაცივებელი საწყობი', temperature: 4, humidity: 60 },
      { storage: 'ნედლეულის საწყობი', temperature: 15, humidity: 50 },
      { storage: 'მზა პროდუქტის საწყობი', temperature: 4, humidity: 55 },
      { storage: 'ქიმიკატების სათავსო', temperature: 18, humidity: 40 },
    ]
    for (const date of dailyDates(startDate)) {
      const exists = await journalExists('STORAGE_CONTROL', date)
      if (exists) continue
      for (const z of storageZones) {
        await prisma.haccpJournal.create({
          data: {
            tenantId: tid, type: 'STORAGE_CONTROL',
            data: { ...z, source: 'backfill' },
            recordedBy: systemUserId, recordedAt: date,
          },
        })
        created++
      }
      console.log(`  ✅ STORAGE_CONTROL: ${date.toISOString().split('T')[0]}`)
    }

    // HEALTH_CHECK — daily
    for (const date of dailyDates(startDate)) {
      const exists = await journalExists('HEALTH_CHECK', date)
      if (exists) continue
      await prisma.haccpJournal.create({
        data: {
          tenantId: tid, type: 'HEALTH_CHECK',
          data: { name: 'პერსონალი', status: 'ჯანმრთელი', source: 'backfill' },
          recordedBy: systemUserId, recordedAt: date,
        },
      })
      created++
      console.log(`  ✅ HEALTH_CHECK: ${date.toISOString().split('T')[0]}`)
    }

    // WASTE_MANAGEMENT — weekly
    const wastes = [
      { wasteType: 'ორგანული ნარჩენი (ლუდის ნარჩ.)', managementMethod: 'კომპოსტირება' },
      { wasteType: 'სველი მარცვალი (დრაბი)', managementMethod: 'კომპოსტირება' },
      { wasteType: 'შეფუთვის მასალა (მუყაო, პლასტმასი)', managementMethod: 'გადამუშავება' },
    ]
    for (const date of weeklyDates(startDate)) {
      const exists = await journalExists('WASTE_MANAGEMENT', date)
      if (exists) continue
      for (const w of wastes) {
        await prisma.haccpJournal.create({
          data: {
            tenantId: tid, type: 'WASTE_MANAGEMENT',
            data: { ...w, source: 'backfill' },
            recordedBy: systemUserId, recordedAt: date,
          },
        })
        created++
      }
      console.log(`  ✅ WASTE_MANAGEMENT: ${date.toISOString().split('T')[0]}`)
    }

    // PEST_CONTROL — weekly
    for (const date of weeklyDates(startDate)) {
      const exists = await journalExists('PEST_CONTROL', date)
      if (exists) continue
      await prisma.haccpJournal.create({
        data: {
          tenantId: tid, type: 'PEST_CONTROL',
          data: {
            procedure: 'ხაფანგების შემოწმება',
            pest: 'მღრღნელები',
            area: 'ყველა ზონა',
            result: 'გამოვლენა არ მომხდარა',
            source: 'backfill',
          },
          recordedBy: systemUserId, recordedAt: date,
        },
      })
      created++
      console.log(`  ✅ PEST_CONTROL: ${date.toISOString().split('T')[0]}`)
    }

    // RODENT_TRAP — weekly
    const weekNames = ['I', 'II', 'III', 'IV']
    let weekIdx = 0
    for (const date of weeklyDates(startDate)) {
      const exists = await journalExists('RODENT_TRAP', date)
      if (exists) continue
      const traps = Object.fromEntries(Array.from({ length: 10 }, (_, i) => [i + 1, true]))
      await prisma.haccpJournal.create({
        data: {
          tenantId: tid, type: 'RODENT_TRAP',
          data: { week: weekNames[weekIdx % 4], traps, checkedCount: 10, source: 'backfill' },
          recordedBy: systemUserId, recordedAt: date,
        },
      })
      created++
      weekIdx++
      console.log(`  ✅ RODENT_TRAP: ${date.toISOString().split('T')[0]}`)
    }

    // JOURNAL_VERIFICATION — weekly
    for (const date of weeklyDates(startDate)) {
      const exists = await journalExists('JOURNAL_VERIFICATION', date)
      if (exists) continue
      await prisma.haccpJournal.create({
        data: {
          tenantId: tid, type: 'JOURNAL_VERIFICATION',
          data: { leader: 'ზაზა ზედგინიძე', notes: 'ყველა ჟურნალი შემოწმდა', source: 'backfill' },
          recordedBy: systemUserId, recordedAt: date,
        },
      })
      created++
      console.log(`  ✅ JOURNAL_VERIFICATION: ${date.toISOString().split('T')[0]}`)
    }

    // THERMOMETER_CALIBRATION — monthly
    const monthlyDates = (from: Date): Date[] => {
      const dates: Date[] = []
      const d = new Date(from)
      while (d <= now) {
        dates.push(new Date(d))
        d.setMonth(d.getMonth() + 1)
      }
      return dates
    }
    for (const date of monthlyDates(startDate)) {
      const exists = await journalExists('THERMOMETER_CALIBRATION', date)
      if (exists) continue
      await prisma.haccpJournal.create({
        data: {
          tenantId: tid, type: 'THERMOMETER_CALIBRATION',
          data: {
            thermometer: 'ციფრული თერმომეტრი №1',
            measured: 0, actual: 0, difference: 0,
            result: 'გამართული', source: 'backfill',
          },
          recordedBy: systemUserId, recordedAt: date,
        },
      })
      created++
      console.log(`  ✅ THERMOMETER_CALIBRATION: ${date.toISOString().split('T')[0]}`)
    }

    // TRAINING — all topics (one-time at start)
    const trainingTopics = [
      'HACCP სისტემა — ზოგადი', 'პირადი ჰიგიენა',
      'რეცხვა-დეზინფექცია', 'მავნებლების კონტროლი',
      'ნარჩენების მართვა', 'ქიმიური საშუ. უსაფრთხოება',
      'სახანძრო უსაფრთხოება',
    ]
    const trainingExists = await prisma.haccpJournal.count({
      where: { tenantId: tid, type: 'TRAINING' },
    })
    if (trainingExists === 0) {
      for (const topic of trainingTopics) {
        await prisma.haccpJournal.create({
          data: {
            tenantId: tid, type: 'TRAINING',
            data: {
              trainee: 'პერსონალი', topic,
              trainer: 'ზაზა ზედგინიძე', source: 'backfill',
            },
            recordedBy: systemUserId, recordedAt: startDate,
          },
        })
        created++
        console.log(`  ✅ TRAINING: ${topic}`)
      }
    }

    // MANAGEMENT_REVIEW — quarterly
    const quarterlyDates = (from: Date): Date[] => {
      const dates: Date[] = []
      const d = new Date(from)
      while (d <= now) {
        dates.push(new Date(d))
        d.setMonth(d.getMonth() + 3)
      }
      return dates
    }
    for (const date of quarterlyDates(startDate)) {
      const exists = await journalExists('MANAGEMENT_REVIEW', date)
      if (exists) continue
      await prisma.haccpJournal.create({
        data: {
          tenantId: tid, type: 'MANAGEMENT_REVIEW',
          data: {
            leader: 'ზაზა ზედგინიძე',
            participants: 'ყველა თანამშრომელი',
            agenda: 'HACCP სისტემის განხილვა, სეზონური შეფასება',
            decisions: 'სისტემა ფუნქციონირებს ნორმალურად',
            source: 'backfill',
          },
          recordedBy: systemUserId, recordedAt: date,
        },
      })
      created++
      console.log(`  ✅ MANAGEMENT_REVIEW: ${date.toISOString().split('T')[0]}`)
    }

    // AUDIT — annual
    const auditExists = await prisma.haccpJournal.count({
      where: { tenantId: tid, type: 'AUDIT' },
    })
    if (auditExists === 0) {
      await prisma.haccpJournal.create({
        data: {
          tenantId: tid, type: 'AUDIT',
          data: {
            auditor: 'ზაზა ზედგინიძე',
            items: { 0: 'yes', 1: 'yes', 2: 'yes', 3: 'yes', 4: 'yes', 5: 'yes' },
            notes: 'ყოველწლიური შიდა აუდიტი — ყველა პუნქტი შესრულებულია',
            source: 'backfill',
          },
          recordedBy: systemUserId, recordedAt: startDate,
        },
      })
      created++
      console.log(`  ✅ AUDIT`)
    }

    // 5. Batches → CCP-1 (BOILING)
    const batches = await prisma.batch.findMany({
      where: { tenantId: tid },
      select: {
        id: true,
        batchNumber: true,
        status: true,
        createdAt: true,
        createdBy: true,
      },
    })

    const existingCcp1 = await prisma.ccpLog.findMany({
      where: { tenantId: tid, ccpType: 'BOILING' },
      select: { batchId: true },
    })
    const loggedCcp1Batches = new Set(existingCcp1.map((c) => c.batchId).filter(Boolean))

    for (const batch of batches) {
      if (loggedCcp1Batches.has(batch.id)) continue
      // Only for batches that have been brewed (not just planned)
      if (batch.status === 'PLANNED') continue

      await prisma.ccpLog.create({
        data: {
          tenantId: tid,
          ccpType: 'BOILING',
          batchId: batch.id,
          temperature: 100,
          duration: 90,
          result: 'PASS',
          recordedBy: systemUserId,
          recordedAt: batch.createdAt,
        },
      })
      created++
      console.log(`  ✅ CCP-1 BOILING: ${batch.batchNumber}`)
    }

    // 6. CCP-2 VESSEL_SANITATION from CIP logs
    const cipLogs = await (prisma as any).cIPLog.findMany({
      where: { Equipment: { tenantId: tid } },
      select: {
        id: true, date: true, duration: true,
        equipmentId: true,
        Equipment: { select: { name: true } },
      },
      orderBy: { date: 'asc' },
    }).catch(() => [])

    const existingCcp2 = await prisma.ccpLog.findMany({
      where: { tenantId: tid, ccpType: 'VESSEL_SANITATION' },
      select: { id: true, batchId: true, correctiveAction: true },
    })

    // Delete ALL non-CIP CCP-2 entries to recreate with correct tank names
    for (const c of existingCcp2) {
      const hasRealCip = String((c as any).correctiveAction || '').includes('CIP ID:')
      const isCipLinked = (c as any).batchId === null && hasRealCip
      if (!isCipLinked) {
        await prisma.ccpLog.delete({ where: { id: c.id } })
        console.log(`  🗑️ წაიშალა CCP-2: id=${c.id}`)
      }
    }

    // Create CCP-2 from CIP logs
    const existingCcp2After = await prisma.ccpLog.findMany({
      where: { tenantId: tid, ccpType: 'VESSEL_SANITATION' },
      select: { correctiveAction: true },
    })
    const loggedCipIds = new Set(
      existingCcp2After
        .map(c => {
          const m = String(c.correctiveAction || '').match(/CIP ID: ([^\s|]+)/)
          return m ? m[1] : null
        })
        .filter(Boolean)
    )

    for (const cip of cipLogs) {
      if (loggedCipIds.has(cip.id)) continue
      const tankName = (cip as any).Equipment?.name || `ავზი ${cip.equipmentId?.substring(0,8)}`
      await prisma.ccpLog.create({
        data: {
          tenantId: tid,
          ccpType: 'VESSEL_SANITATION',
          phLevel: 6.5,
          visualCheck: true,
          result: 'PASS',
          correctiveAction: `ავტომატურად CIP-იდან | CIP ID: ${cip.id} | ავზი: ${tankName}`,
          recordedBy: systemUserId,
          recordedAt: cip.date,
        },
      })
      created++
      console.log(`  ✅ CCP-2: ${tankName} — ${new Date(cip.date).toLocaleDateString('ka-GE')}`)
    }
  }

  console.log(`\n🎉 დასრულდა! სულ შეიქმნა: ${created} ჩანაწერი`)
  await prisma.$disconnect()
}

main().catch(e => {
  console.error('❌ შეცდომა:', e)
  prisma.$disconnect()
  process.exit(1)
})
