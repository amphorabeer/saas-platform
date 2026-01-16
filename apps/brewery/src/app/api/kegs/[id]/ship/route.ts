import { NextRequest, NextResponse } from 'next/server'
import { withTenant, RouteContext } from '@/lib/api-middleware'
import { prisma } from '@saas-platform/database'

// POST - კეგის გაგზავნა კლიენტთან
export const POST = withTenant(async (
  req: NextRequest,
  ctx: RouteContext
) => {
  try {
    // Extract id from URL: /api/kegs/[id]/ship
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/')
    const idIndex = pathParts.indexOf('kegs') + 1
    const id = pathParts[idIndex]
    
    if (!id) {
      return NextResponse.json({ error: 'კეგის ID სავალდებულოა' }, { status: 400 })
    }
    const body = await req.json()
    const { customerId, orderId, notes } = body

    if (!customerId) {
      return NextResponse.json({ error: 'customerId სავალდებულოა' }, { status: 400 })
    }

    const currentKeg = await (prisma as any).keg.findUnique({ 
      where: { id },
    })
    
    if (!currentKeg || currentKeg.tenantId !== ctx.tenantId) {
      return NextResponse.json({ error: 'კეგი ვერ მოიძებნა' }, { status: 404 })
    }

    if (currentKeg.status !== 'FILLED') {
      return NextResponse.json({ 
        error: 'მხოლოდ სავსე კეგი შეიძლება გაიგზავნოს' 
      }, { status: 400 })
    }

    const customer = await prisma.customer.findFirst({
      where: { 
        id: customerId,
        tenantId: ctx.tenantId,
      },
      select: { id: true, name: true },
    })

    if (!customer) {
      return NextResponse.json({ error: 'კლიენტი ვერ მოიძებნა' }, { status: 404 })
    }

    const keg = await (prisma as any).keg.update({
      where: { id },
      data: {
        status: 'WITH_CUSTOMER',
        customerId,
        orderId: orderId || null,
        sentAt: new Date(),
        updatedAt: new Date(),
      },
    })

    // ჩავწეროთ movement
    await (prisma as any).kegMovement.create({
      data: {
        tenantId: ctx.tenantId,
        kegId: keg.id,
        action: 'SHIPPED',
        fromStatus: 'FILLED',
        toStatus: 'WITH_CUSTOMER',
        customerId,
        customerName: customer.name,
        orderId: orderId || null,
        productName: currentKeg.productName,
        notes,
        createdBy: ctx.userId,
      },
    })

    return NextResponse.json({ keg, message: 'კეგი გაიგზავნა კლიენტთან' })
  } catch (error) {
    console.error('[Kegs Ship API] POST error:', error)
    return NextResponse.json({ error: 'Failed to ship keg' }, { status: 500 })
  }
})

