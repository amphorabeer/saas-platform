import { NextRequest, NextResponse } from 'next/server'
import { withTenant, RouteContext } from '@/lib/api-middleware'
import { prisma } from '@saas-platform/database'

// GET - კეგების სია ფილტრებით
export const GET = withTenant(async (req: NextRequest, ctx: RouteContext) => {
  try {
    // Keg model may not exist in shared schema
    if (!(prisma as any).keg) {
      console.log('[Kegs API] Keg model not available in shared schema')
      return NextResponse.json({ kegs: [], stats: {} })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const customerId = searchParams.get('customerId')
    const size = searchParams.get('size')
    const overdue = searchParams.get('overdue') // 'true' - ვადაგადაცილებული

    const where: any = { tenantId: ctx.tenantId }

    if (status && status !== 'all') {
      where.status = status
    }

    if (customerId && customerId !== 'all') {
      where.customerId = customerId
    }

    if (size && size !== 'all') {
      where.size = parseInt(size)
    }

    const kegs = await (prisma as any).keg.findMany({
      where,
      include: {
        Customer: {
          select: {
            id: true,
            name: true,
            kegReturnDays: true,
          },
        },
        Batch: {
          select: {
            id: true,
            batchNumber: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // კეგების სტატისტიკა
    const stats = await (prisma as any).keg.groupBy({
      by: ['status'],
      where: { tenantId: ctx.tenantId },
      _count: { status: true },
    })

    // ვადაგადაცილებული კეგების რაოდენობა
    const now = new Date()
    const overdueKegs = kegs.filter((keg: any) => {
      if (keg.status !== 'WITH_CUSTOMER' || !keg.sentAt) return false
      const returnDays = keg.Customer?.kegReturnDays || 14
      const dueDate = new Date(keg.sentAt)
      dueDate.setDate(dueDate.getDate() + returnDays)
      return now > dueDate
    })

    // დავაფორმატოთ კეგები დამატებითი ინფოთი
    const formattedKegs = kegs.map((keg: any) => {
      let daysOut = null
      let isOverdue = false
      let dueDate = null

      if (keg.status === 'WITH_CUSTOMER' && keg.sentAt) {
        const returnDays = keg.Customer?.kegReturnDays || 14
        dueDate = new Date(keg.sentAt)
        dueDate.setDate(dueDate.getDate() + returnDays)
        daysOut = Math.floor((now.getTime() - new Date(keg.sentAt).getTime()) / (1000 * 60 * 60 * 24))
        isOverdue = now > dueDate
      }

      return {
        ...keg,
        customerName: keg.Customer?.name || null,
        batchNumber: keg.Batch?.batchNumber || null,
        daysOut,
        isOverdue,
        dueDate,
      }
    })

    // ფილტრაცია ვადაგადაცილებულზე თუ მოთხოვნილია
    const finalKegs = overdue === 'true' 
      ? formattedKegs.filter((k: any) => k.isOverdue)
      : formattedKegs

    const statsMap = {
      total: kegs.length,
      available: stats.find((s: any) => s.status === 'AVAILABLE')?._count.status || 0,
      filled: stats.find((s: any) => s.status === 'FILLED')?._count.status || 0,
      withCustomer: stats.find((s: any) => s.status === 'WITH_CUSTOMER')?._count.status || 0,
      inTransit: stats.find((s: any) => s.status === 'IN_TRANSIT')?._count.status || 0,
      cleaning: stats.find((s: any) => s.status === 'CLEANING')?._count.status || 0,
      damaged: stats.find((s: any) => s.status === 'DAMAGED')?._count.status || 0,
      lost: stats.find((s: any) => s.status === 'LOST')?._count.status || 0,
      overdue: overdueKegs.length,
    }

    return NextResponse.json({ kegs: finalKegs, stats: statsMap })
  } catch (error) {
    console.log('[Kegs API] Keg model not available, returning empty array:', error)
    return NextResponse.json({ kegs: [], stats: {} })
  }
})

// POST - ახალი კეგის დამატება
export const POST = withTenant(async (req: NextRequest, ctx: RouteContext) => {
  try {
    // Keg model may not exist in shared schema
    if (!(prisma as any).keg) {
      console.log('[Kegs API] Keg model not available in shared schema')
      return NextResponse.json({ error: 'Keg model not available' }, { status: 501 })
    }

    const body = await req.json()
    const { kegNumber, size, notes } = body

    if (!kegNumber || !size) {
      return NextResponse.json({ error: 'kegNumber და size სავალდებულოა' }, { status: 400 })
    }

    // შევამოწმოთ უნიკალურობა
    const existing = await (prisma as any).keg.findUnique({
      where: { tenantId_kegNumber: { tenantId: ctx.tenantId, kegNumber } },
    })

    if (existing) {
      return NextResponse.json({ error: 'კეგი ამ ნომრით უკვე არსებობს' }, { status: 400 })
    }

    const keg = await (prisma as any).keg.create({
      data: {
        tenantId: ctx.tenantId,
        kegNumber,
        size,
        status: 'AVAILABLE',
        condition: 'GOOD',
        notes,
      },
    })

    // ჩავწეროთ movement
    await (prisma as any).kegMovement.create({
      data: {
        tenantId: ctx.tenantId,
        kegId: keg.id,
        action: 'CREATED',
        fromStatus: 'AVAILABLE',
        toStatus: 'AVAILABLE',
        notes: 'ახალი კეგი დაემატა',
        createdBy: ctx.userId,
      },
    })

    return NextResponse.json({ keg })
  } catch (error) {
    console.log('[Kegs API] POST error - Keg model not available:', error)
    return NextResponse.json({ error: 'Keg model not available' }, { status: 501 })
  }
})

// PATCH - კეგის სტატუსის/მდგომარეობის განახლება
export const PATCH = withTenant(async (req: NextRequest, ctx: RouteContext) => {
  try {
    // Keg model may not exist in shared schema
    if (!(prisma as any).keg) {
      console.log('[Kegs API] Keg model not available in shared schema')
      return NextResponse.json({ error: 'Keg model not available' }, { status: 501 })
    }

    const body = await req.json()
    const { id, status, condition, notes } = body

    if (!id) {
      return NextResponse.json({ error: 'id სავალდებულოა' }, { status: 400 })
    }

    const currentKeg = await (prisma as any).keg.findUnique({ 
      where: { id },
    })
    
    if (!currentKeg || currentKeg.tenantId !== ctx.tenantId) {
      return NextResponse.json({ error: 'კეგი ვერ მოიძებნა' }, { status: 404 })
    }

    const updateData: any = { updatedAt: new Date() }
    if (status) updateData.status = status
    if (condition) updateData.condition = condition
    if (notes !== undefined) updateData.notes = notes

    // თუ AVAILABLE-ზე გადავდივართ, გავწმინდოთ customer/order
    if (status === 'AVAILABLE') {
      updateData.customerId = null
      updateData.orderId = null
      updateData.returnedAt = new Date()
    }

    const keg = await (prisma as any).keg.update({
      where: { id },
      data: updateData,
    })

    // ჩავწეროთ movement თუ სტატუსი შეიცვალა
    if (status && status !== currentKeg.status) {
      await (prisma as any).kegMovement.create({
        data: {
          tenantId: ctx.tenantId,
          kegId: keg.id,
          action: status === 'AVAILABLE' ? 'CLEANED' : 'DAMAGED',
          fromStatus: currentKeg.status,
          toStatus: status,
          notes,
          createdBy: ctx.userId,
        },
      })
    }

    return NextResponse.json({ keg })
  } catch (error) {
    console.log('[Kegs API] PATCH error - Keg model not available:', error)
    return NextResponse.json({ error: 'Keg model not available' }, { status: 501 })
  }
})

