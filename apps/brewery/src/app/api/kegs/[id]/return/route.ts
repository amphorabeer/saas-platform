import { NextRequest, NextResponse } from 'next/server'
import { withTenant, RouteContext } from '@/lib/api-middleware'
import { prisma } from '@saas-platform/database'

// POST - კეგის დაბრუნება კლიენტისგან
export const POST = withTenant(async (
  req: NextRequest,
  ctx: RouteContext
) => {
  try {
    // Extract id from URL: /api/kegs/[id]/return
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/')
    const idIndex = pathParts.indexOf('kegs') + 1
    const id = pathParts[idIndex]
    
    if (!id) {
      return NextResponse.json({ error: 'კეგის ID სავალდებულოა' }, { status: 400 })
    }
    const body = await req.json()
    const { condition, notes } = body // condition: 'GOOD' | 'NEEDS_CLEANING' | 'DAMAGED'

    const currentKeg = await (prisma as any).keg.findUnique({ 
      where: { id },
      include: {
        Customer: { select: { id: true, name: true } },
      },
    })

    if (!currentKeg) {
      return NextResponse.json({ error: 'კეგი ვერ მოიძებნა' }, { status: 404 })
    }

    if (currentKeg.tenantId !== ctx.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    if (currentKeg.status !== 'WITH_CUSTOMER' && currentKeg.status !== 'IN_TRANSIT') {
      return NextResponse.json({ 
        error: `კეგი არ არის კლიენტთან. მიმდინარე სტატუსი: ${currentKeg.status}` 
      }, { status: 400 })
    }

    // განვსაზღვროთ ახალი სტატუსი condition-ის მიხედვით
    let newStatus: 'AVAILABLE' | 'CLEANING' | 'DAMAGED' = 'AVAILABLE'
    if (condition === 'NEEDS_CLEANING') {
      newStatus = 'CLEANING'
    } else if (condition === 'DAMAGED') {
      newStatus = 'DAMAGED'
    }

    const keg = await (prisma as any).keg.update({
      where: { id },
      data: {
        status: newStatus,
        condition: condition || 'GOOD',
        returnedAt: new Date(),
        // გავწმინდოთ customer/order info თუ AVAILABLE-ზე გადავდივართ
        ...(newStatus === 'AVAILABLE' && {
          customerId: null,
          orderId: null,
        }),
        updatedAt: new Date(),
      },
    })

    // ჩავწეროთ movement
    await (prisma as any).kegMovement.create({
      data: {
        tenantId: ctx.tenantId,
        kegId: keg.id,
        action: 'RETURNED',
        fromStatus: currentKeg.status,
        toStatus: newStatus,
        customerId: currentKeg.customerId,
        customerName: currentKeg.Customer?.name,
        orderId: currentKeg.orderId,
        productName: currentKeg.productName,
        notes: notes || `მდგომარეობა: ${condition || 'GOOD'}`,
        createdBy: ctx.userId,
      },
    })

    // თუ CLEANING-ზე გადავიდა, დავამატოთ შესაბამისი movement
    if (newStatus === 'CLEANING') {
      // Could trigger automatic cleaning workflow here
    }

    return NextResponse.json({ 
      success: true,
      keg, 
      depositRefunded: newStatus !== 'DAMAGED', // დეპოზიტი ბრუნდება თუ არ არის დაზიანებული
    })
  } catch (error) {
    console.error('[Kegs Return API] POST error:', error)
    return NextResponse.json({ error: 'Failed to return keg' }, { status: 500 })
  }
})

