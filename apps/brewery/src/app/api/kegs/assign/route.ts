import { NextRequest, NextResponse } from 'next/server'
import { withTenant, RouteContext } from '@/lib/api-middleware'
import { prisma } from '@saas-platform/database'

// POST - კეგების მინიჭება შეკვეთაზე
export const POST = withTenant(async (req: NextRequest, ctx: RouteContext) => {
  try {
    const body = await req.json()
    const { orderId, customerId, kegIds, productName, batchId } = body

    if (!orderId || !customerId || !kegIds?.length) {
      return NextResponse.json(
        { error: 'orderId, customerId და kegIds სავალდებულოა' },
        { status: 400 }
      )
    }

    // შევამოწმოთ კეგები ხელმისაწვდომია თუ არა
    const kegs = await (prisma as any).keg.findMany({
      where: {
        id: { in: kegIds },
        tenantId: ctx.tenantId,
        status: { in: ['AVAILABLE', 'FILLED'] },
      },
    })

    if (kegs.length !== kegIds.length) {
      const availableIds = kegs.map((k: any) => k.id)
      const unavailable = kegIds.filter((id: string) => !availableIds.includes(id))
      return NextResponse.json(
        { error: `ზოგიერთი კეგი მიუწვდომელია: ${unavailable.join(', ')}` },
        { status: 400 }
      )
    }

    // Get customer name for movement history
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { name: true },
    })

    const now = new Date()
    const results = []

    // განვაახლოთ თითოეული კეგი
    for (const keg of kegs) {
      const updatedKeg = await (prisma as any).keg.update({
        where: { id: keg.id },
        data: {
          status: 'WITH_CUSTOMER',
          customerId,
          orderId,
          productName: productName || keg.productName,
          batchId: batchId || keg.batchId,
          sentAt: now,
          updatedAt: now,
        },
      })

      // ჩავწეროთ movement
      await (prisma as any).kegMovement.create({
        data: {
          tenantId: ctx.tenantId,
          kegId: keg.id,
          action: 'SHIPPED',
          fromStatus: keg.status,
          toStatus: 'WITH_CUSTOMER',
          customerId,
          customerName: customer?.name,
          orderId,
          productName: productName || keg.productName,
          batchId: batchId || keg.batchId,
          notes: `შეკვეთა: ${orderId}`,
          createdBy: ctx.userId,
        },
      })

      results.push(updatedKeg)
    }

    return NextResponse.json({
      success: true,
      assignedKegs: results,
      count: results.length,
    })
  } catch (error) {
    console.error('[Kegs Assign API] error:', error)
    return NextResponse.json({ error: 'კეგების მინიჭება ვერ მოხერხდა' }, { status: 500 })
  }
})


