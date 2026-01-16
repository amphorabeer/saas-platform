import { NextRequest, NextResponse } from 'next/server'
import { withTenant, RouteContext } from '@/lib/api-middleware'
import { prisma } from '@saas-platform/database'

// POST - კეგის შევსება (Packaging-დან)
export const POST = withTenant(async (
  req: NextRequest,
  ctx: RouteContext
) => {
  try {
    // Extract id from URL: /api/kegs/[id]/fill
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/')
    const idIndex = pathParts.indexOf('kegs') + 1
    const id = pathParts[idIndex]
    
    if (!id) {
      return NextResponse.json({ error: 'კეგის ID სავალდებულოა' }, { status: 400 })
    }
    const body = await req.json()
    const { batchId, productName, lotNumber, notes } = body

    const currentKeg = await (prisma as any).keg.findUnique({ 
      where: { id },
    })
    
    if (!currentKeg) {
      return NextResponse.json({ error: 'კეგი ვერ მოიძებნა' }, { status: 404 })
    }

    if (currentKeg.tenantId !== ctx.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    if (currentKeg.status !== 'AVAILABLE') {
      return NextResponse.json({ 
        error: 'მხოლოდ ცარიელი კეგი შეიძლება შეივსოს' 
      }, { status: 400 })
    }

    const keg = await (prisma as any).keg.update({
      where: { id },
      data: {
        status: 'FILLED',
        batchId: batchId || null,
        productName: productName || null,
        lotNumber: lotNumber || null,
        filledAt: new Date(),
        updatedAt: new Date(),
      },
    })

    // ჩავწეროთ movement
    await (prisma as any).kegMovement.create({
      data: {
        tenantId: ctx.tenantId,
        kegId: keg.id,
        action: 'FILLED',
        fromStatus: 'AVAILABLE',
        toStatus: 'FILLED',
        batchId: batchId || null,
        productName: productName || null,
        notes,
        createdBy: ctx.userId,
      },
    })

    return NextResponse.json({ keg, message: 'კეგი შეივსო' })
  } catch (error) {
    console.error('[Kegs Fill API] POST error:', error)
    return NextResponse.json({ error: 'Failed to fill keg' }, { status: 500 })
  }
})

