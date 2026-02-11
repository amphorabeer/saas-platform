export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'

// GET - ყველა შეკვეთა
export async function GET(request: NextRequest) {
  try {
    const { getTenantId, unauthorizedResponse } = await import('@/lib/tenant')
    const tenantId = await getTenantId()
    
    if (!tenantId) {
      return unauthorizedResponse()
    }
    
    const { getPrismaClient } = await import('@/lib/prisma')
    const prisma = getPrismaClient()

    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    const status = searchParams.get('status')
    const tableId = searchParams.get('tableId')

    const where: any = { tenantId }
    
    if (date) {
      const startOfDay = new Date(date)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(date)
      endOfDay.setHours(23, 59, 59, 999)
      where.createdAt = { gte: startOfDay, lte: endOfDay }
    }
    if (status) where.status = status
    if (tableId) where.tableId = tableId

    const orders = await prisma.restaurantOrder.findMany({
      where,
      include: {
        items: true
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(orders)
  } catch (error: any) {
    console.error('Error fetching restaurant orders:', error)
    return NextResponse.json({ error: 'Failed to fetch orders', details: error.message }, { status: 500 })
  }
}

// POST - ახალი შეკვეთა
export async function POST(request: NextRequest) {
  try {
    const { getTenantId, unauthorizedResponse } = await import('@/lib/tenant')
    const tenantId = await getTenantId()
    
    if (!tenantId) {
      return unauthorizedResponse()
    }
    
    const { getPrismaClient } = await import('@/lib/prisma')
    const prisma = getPrismaClient()

    const body = await request.json()
    const { 
      tableId, tableNumber, customerType, guestName, roomNumber,
      reservationId, companyId, groupName, groupSize,
      items, subtotal, tax, serviceCharge, total, 
      status, notes, createdBy
    } = body

    // Generate order number
    const today = new Date()
    const dateStr = today.toISOString().slice(2, 10).replace(/-/g, '')
    const timeStr = today.toTimeString().slice(0, 5).replace(':', '')
    const orderNumber = `R${dateStr}${timeStr}`

    const order = await prisma.restaurantOrder.create({
      data: {
        tenantId,
        orderNumber,
        tableNumber: tableNumber || null,
        customerType: customerType || 'walk_in',
        guestName: guestName || null,
        roomNumber: roomNumber || null,
        reservationId: reservationId || null,
        companyId: companyId || null,
        subtotal: Number(subtotal || 0),
        tax: Number(tax || 0),
        serviceCharge: Number(serviceCharge || 0),
        total: Number(total || 0),
        status: status || 'open',
        notes: notes || null,
        createdBy: createdBy || null,
        items: items?.length > 0 ? {
          create: items.map((item: any) => ({
            menuItemId: item.menuItemId || null,
            name: item.name,
            quantity: item.quantity || 1,
            unitPrice: Number(item.unitPrice || 0),
            total: Number(item.total || 0),
            notes: item.notes || null
          }))
        } : undefined
      },
      include: { items: true }
    })

    return NextResponse.json(order, { status: 201 })
  } catch (error: any) {
    console.error('Error creating restaurant order:', error)
    return NextResponse.json({ error: 'Failed to create order', details: error.message }, { status: 500 })
  }
}

// PUT - შეკვეთის განახლება
export async function PUT(request: NextRequest) {
  try {
    const { getTenantId, unauthorizedResponse } = await import('@/lib/tenant')
    const tenantId = await getTenantId()
    
    if (!tenantId) {
      return unauthorizedResponse()
    }
    
    const { getPrismaClient } = await import('@/lib/prisma')
    const prisma = getPrismaClient()

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({ error: 'Order ID required' }, { status: 400 })
    }

    const body = await request.json()
    
    const updateData: any = {}
    if (body.tableId !== undefined) updateData.tableId = body.tableId
    if (body.tableNumber !== undefined) updateData.tableNumber = body.tableNumber
    if (body.customerType !== undefined) updateData.customerType = body.customerType
    if (body.guestName !== undefined) updateData.guestName = body.guestName
    if (body.roomNumber !== undefined) updateData.roomNumber = body.roomNumber
    if (body.subtotal !== undefined) updateData.subtotal = Number(body.subtotal)
    if (body.tax !== undefined) updateData.tax = Number(body.tax)
    if (body.serviceCharge !== undefined) updateData.serviceCharge = Number(body.serviceCharge)
    if (body.total !== undefined) updateData.total = Number(body.total)
    if (body.status !== undefined) updateData.status = body.status
    if (body.paymentMethod !== undefined) updateData.paymentMethod = body.paymentMethod
    if (body.paidAt !== undefined) updateData.paidAt = new Date(body.paidAt)
    if (body.notes !== undefined) updateData.notes = body.notes

    const order = await prisma.restaurantOrder.update({
      where: { id },
      data: updateData,
      include: { items: true }
    })

    return NextResponse.json(order)
  } catch (error: any) {
    console.error('Error updating restaurant order:', error)
    return NextResponse.json({ error: 'Failed to update order', details: error.message }, { status: 500 })
  }
}