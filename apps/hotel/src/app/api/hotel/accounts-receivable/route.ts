export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'

// GET - ყველა დებიტორული დავალიანება
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
    const companyId = searchParams.get('companyId')
    const status = searchParams.get('status')

    const where: any = { tenantId }
    if (companyId) where.companyId = companyId
    if (status) where.status = status

    const receivables = await prisma.accountReceivable.findMany({
      where,
      include: {
        company: {
          select: { id: true, name: true, email: true, phone: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Map to include companyName for convenience
    const mapped = receivables.map((r: any) => ({
      ...r,
      companyName: r.company?.name || 'Unknown',
      amount: r.amount ? Number(r.amount) : 0,
      paidAmount: r.paidAmount ? Number(r.paidAmount) : 0,
      // Add sourceType for filtering (use type field from schema)
      sourceType: r.type
    }))

    console.log('[accounts-receivable] Returning', mapped.length, 'receivables')
    return NextResponse.json(mapped)
  } catch (error: any) {
    console.error('Error fetching receivables:', error)
    return NextResponse.json({ error: 'Failed to fetch receivables', details: error.message }, { status: 500 })
  }
}

// POST - ახალი დებიტორული ჩანაწერი
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
    const { companyId, invoiceId, amount, dueDate, description, sourceType, sourceRef, type } = body

    if (!companyId || !amount) {
      return NextResponse.json({ error: 'Company ID and amount are required' }, { status: 400 })
    }

    const receivable = await prisma.accountReceivable.create({
      data: {
        tenantId,
        companyId,
        invoiceId: invoiceId || null,
        amount,
        paidAmount: 0,
        dueDate: dueDate ? new Date(dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'pending',
        // Use schema fields: type and description
        type: type || sourceType || 'invoice',
        description: description || `Invoice charge`,
        reference: sourceRef || null
      },
      include: {
        company: {
          select: { id: true, name: true }
        }
      }
    })

    console.log('[accounts-receivable] Created receivable:', receivable.id)
    return NextResponse.json({
      ...receivable,
      companyName: receivable.company?.name || 'Unknown',
      amount: Number(receivable.amount),
      paidAmount: Number(receivable.paidAmount),
      sourceType: receivable.type
    }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating receivable:', error)
    return NextResponse.json({ error: 'Failed to create receivable', details: error.message }, { status: 500 })
  }
}

// PUT - გადახდის რეგისტრაცია
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
      return NextResponse.json({ error: 'Receivable ID required' }, { status: 400 })
    }

    const body = await request.json()
    const { paidAmount, status } = body

    // Get current receivable
    const current = await prisma.accountReceivable.findUnique({
      where: { id }
    })

    if (!current) {
      return NextResponse.json({ error: 'Receivable not found' }, { status: 404 })
    }

    const newPaidAmount = Number(current.paidAmount) + (paidAmount || 0)
    const totalAmount = Number(current.amount)
    
    // Determine status
    let newStatus = status
    if (!newStatus) {
      if (newPaidAmount >= totalAmount) {
        newStatus = 'paid'
      } else if (newPaidAmount > 0) {
        newStatus = 'partial'
      } else {
        newStatus = current.status
      }
    }

    const receivable = await prisma.accountReceivable.update({
      where: { id },
      data: {
        paidAmount: newPaidAmount,
        status: newStatus
      },
      include: {
        company: {
          select: { id: true, name: true }
        }
      }
    })

    return NextResponse.json({
      ...receivable,
      companyName: receivable.company?.name || 'Unknown',
      amount: Number(receivable.amount),
      paidAmount: Number(receivable.paidAmount),
      sourceType: receivable.type
    })
  } catch (error: any) {
    console.error('Error updating receivable:', error)
    return NextResponse.json({ error: 'Failed to update receivable', details: error.message }, { status: 500 })
  }
}

// DELETE - წაშლა
export async function DELETE(request: NextRequest) {
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
      return NextResponse.json({ error: 'Receivable ID required' }, { status: 400 })
    }

    await prisma.accountReceivable.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting receivable:', error)
    return NextResponse.json({ error: 'Failed to delete receivable', details: error.message }, { status: 500 })
  }
}