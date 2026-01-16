import { NextRequest, NextResponse } from 'next/server'
import { withTenant, RouteContext } from '@/lib/api-middleware'
import { prisma } from '@saas-platform/database'

// Helper to extract ID from URL
function extractIdFromUrl(url: string): string | null {
  const urlObj = new URL(url)
  const pathParts = urlObj.pathname.split('/')
  const idIndex = pathParts.indexOf('kegs') + 1
  return pathParts[idIndex] || null
}

// GET - ერთი კეგის დეტალები
export const GET = withTenant(async (req: NextRequest, ctx: RouteContext) => {
  try {
    const id = extractIdFromUrl(req.url)
    
    if (!id) {
      return NextResponse.json({ error: 'კეგის ID სავალდებულოა' }, { status: 400 })
    }

    const keg = await (prisma as any).keg.findUnique({
      where: { id },
      include: {
        Customer: { select: { id: true, name: true, phone: true } },
        Batch: { select: { id: true, batchNumber: true } },
        movements: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    })

    if (!keg || keg.tenantId !== ctx.tenantId) {
      return NextResponse.json({ error: 'კეგი ვერ მოიძებნა' }, { status: 404 })
    }

    return NextResponse.json({ keg })
  } catch (error) {
    console.error('[Keg Detail API] error:', error)
    return NextResponse.json({ error: 'კეგის მოძიება ვერ მოხერხდა' }, { status: 500 })
  }
})

// PATCH - კეგის განახლება (status, condition, etc.)
export const PATCH = withTenant(async (req: NextRequest, ctx: RouteContext) => {
  try {
    const id = extractIdFromUrl(req.url)
    const body = await req.json()
    const { status, condition, notes } = body

    if (!id) {
      return NextResponse.json({ error: 'კეგის ID სავალდებულოა' }, { status: 400 })
    }

    const currentKeg = await (prisma as any).keg.findUnique({
      where: { id },
    })

    if (!currentKeg || currentKeg.tenantId !== ctx.tenantId) {
      return NextResponse.json({ error: 'კეგი ვერ მოიძებნა' }, { status: 404 })
    }

    const updateData: any = { updatedAt: new Date() }
    
    if (status) {
      updateData.status = status
      
      // Status-specific updates
      if (status === 'AVAILABLE') {
        updateData.customerId = null
        updateData.orderId = null
        updateData.returnedAt = new Date()
      } else if (status === 'CLEANING') {
        // Keep customer info for tracking
      } else if (status === 'FILLED') {
        updateData.filledAt = new Date()
      }
    }
    
    if (condition) {
      updateData.condition = condition
    }
    
    if (notes !== undefined) {
      updateData.notes = notes
    }

    const updatedKeg = await (prisma as any).keg.update({
      where: { id },
      data: updateData,
    })

    // Log movement if status changed
    if (status && status !== currentKeg.status) {
      let action: 'CLEANED' | 'DAMAGED' | 'LOST' | 'FILLED' = 'CLEANED'
      if (status === 'DAMAGED') action = 'DAMAGED'
      if (status === 'LOST') action = 'LOST'
      if (status === 'FILLED') action = 'FILLED'

      await (prisma as any).kegMovement.create({
        data: {
          tenantId: ctx.tenantId,
          kegId: id,
          action,
          fromStatus: currentKeg.status,
          toStatus: status,
          notes,
          createdBy: ctx.userId,
        },
      })
    }

    return NextResponse.json({ keg: updatedKeg })
  } catch (error) {
    console.error('[Keg PATCH API] error:', error)
    return NextResponse.json({ error: 'კეგის განახლება ვერ მოხერხდა' }, { status: 500 })
  }
})

// DELETE - კეგის წაშლა
export const DELETE = withTenant(async (
  req: NextRequest,
  ctx: RouteContext
) => {
  try {
    const id = extractIdFromUrl(req.url)
    
    if (!id) {
      return NextResponse.json({ error: 'კეგის ID სავალდებულოა' }, { status: 400 })
    }

    // შევამოწმოთ კეგი არსებობს და ჩვენი tenant-ისაა
    const keg = await (prisma as any).keg.findFirst({
      where: { id, tenantId: ctx.tenantId },
    })

    if (!keg) {
      return NextResponse.json({ error: 'კეგი ვერ მოიძებნა' }, { status: 404 })
    }

    // არ წავშალოთ თუ კლიენტთანაა
    if (keg.status === 'WITH_CUSTOMER') {
      return NextResponse.json({ 
        error: 'კლიენტთან მყოფი კეგის წაშლა შეუძლებელია' 
      }, { status: 400 })
    }

    // წავშალოთ movements ჯერ
    await (prisma as any).kegMovement.deleteMany({
      where: { kegId: id, tenantId: ctx.tenantId },
    })

    // წავშალოთ კეგი
    await (prisma as any).keg.delete({
      where: { id },
    })

    return NextResponse.json({ success: true, message: 'კეგი წაიშალა' })
  } catch (error) {
    console.error('[Keg DELETE] Error:', error)
    return NextResponse.json({ error: 'კეგის წაშლა ვერ მოხერხდა' }, { status: 500 })
  }
})

