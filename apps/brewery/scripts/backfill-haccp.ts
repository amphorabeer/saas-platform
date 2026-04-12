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
            temperature: Number(r.temperature),
            batchId: r.batchId,
            batchNumber: r.batch.batchNumber,
            tankId: r.batch.tankId || null,
            tankName,
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
  }

  console.log(`\n🎉 დასრულდა! სულ შეიქმნა: ${created} ჩანაწერი`)
  await prisma.$disconnect()
}

main().catch(e => {
  console.error('❌ შეცდომა:', e)
  prisma.$disconnect()
  process.exit(1)
})
