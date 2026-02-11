export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'

// GET - ყველა ინვოისის მიღება
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

    const invoices = await prisma.companyInvoice.findMany({
      where,
      include: {
        company: {
          select: { id: true, name: true, email: true, taxId: true, address: true }
        },
        items: true
      },
      orderBy: { createdAt: 'desc' }
    })

    // Map to frontend expected format
    const mapped = invoices.map((inv: any) => ({
      ...inv,
      companyName: inv.company?.name || 'Unknown',
      total: Number(inv.total) || 0,
      subtotal: Number(inv.subtotal) || 0,
      tax: Number(inv.tax) || 0,
      paidAmount: Number(inv.paidAmount) || 0,
      discount: Number(inv.discount) || 0
    }))

    return NextResponse.json(mapped)
  } catch (error: any) {
    console.error('Error fetching invoices:', error)
    return NextResponse.json({ error: 'Failed to fetch invoices', details: error.message }, { status: 500 })
  }
}

// POST - ახალი ინვოისის შექმნა
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
    const { companyId, items, subtotal, tax, serviceCharge, total, dueDate, notes } = body

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 })
    }

    // Generate invoice number
    const year = new Date().getFullYear()
    const month = String(new Date().getMonth() + 1).padStart(2, '0')
    const count = await prisma.companyInvoice.count({
      where: { tenantId }
    })
    const invoiceNumber = `INV-${year}${month}-${String(count + 1).padStart(4, '0')}`

    // Calculate due date (default 30 days)
    const company = await prisma.tourCompany.findUnique({
      where: { id: companyId },
      select: { paymentTerms: true }
    })
    const paymentTerms = company?.paymentTerms || 30
    const calculatedDueDate = dueDate || new Date(Date.now() + paymentTerms * 24 * 60 * 60 * 1000)

    const invoice = await prisma.companyInvoice.create({
      data: {
        tenantId,
        companyId,
        invoiceNumber,
        issueDate: new Date(),
        dueDate: new Date(calculatedDueDate),
        status: 'pending',
        subtotal: subtotal || 0,
        discount: 0,
        tax: tax || 0,
        total: total || 0,
        paidAmount: 0,
        notes,
        items: {
          create: (items || []).map((item: any, index: number) => ({
            description: item.description || item.name || `Item ${index + 1}`,
            quantity: item.quantity || 1,
            unitPrice: item.unitPrice || item.price || 0,
            total: item.total || (item.quantity || 1) * (item.unitPrice || item.price || 0)
          }))
        }
      },
      include: {
        company: {
          select: { id: true, name: true, email: true, taxId: true, address: true }
        },
        items: true
      }
    })

    console.log('[company-invoices] Created invoice:', invoice.invoiceNumber)
    return NextResponse.json(invoice, { status: 201 })
  } catch (error: any) {
    console.error('Error creating invoice:', error)
    return NextResponse.json({ error: 'Failed to create invoice', details: error.message }, { status: 500 })
  }
}

// PUT - ინვოისის განახლება
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
      return NextResponse.json({ error: 'Invoice ID required' }, { status: 400 })
    }

    const body = await request.json()
    const { status, paidAmount, notes } = body
    
    console.log('[company-invoices] PUT request:', { id, status, paidAmount, notes })
    
    // Debug: check if invoice exists at all
    const allInvoices = await prisma.companyInvoice.findMany({
      select: { id: true, tenantId: true, invoiceNumber: true }
    })
    console.log('[company-invoices] All invoices in DB:', allInvoices)

    // Get current invoice - must belong to this tenant
    const current = await prisma.companyInvoice.findFirst({
      where: { 
        id,
        tenantId  // Ensure it belongs to this tenant
      },
      select: { id: true, total: true, paidAmount: true, tenantId: true }
    })
    
    console.log('[company-invoices] Current invoice:', current, 'looking for tenantId:', tenantId)
    
    if (!current) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    const updateData: any = {}
    
    // Add payment to existing paidAmount
    if (paidAmount !== undefined && paidAmount !== null) {
      const currentPaid = current.paidAmount ? Number(current.paidAmount) : 0
      const paymentAmount = Number(paidAmount) || 0
      const newPaidAmount = currentPaid + paymentAmount
      updateData.paidAmount = newPaidAmount
      
      // Auto-set status based on payment
      const totalAmount = Number(current.total) || 0
      if (newPaidAmount >= totalAmount) {
        updateData.status = 'paid'
      } else if (newPaidAmount > 0) {
        updateData.status = 'partial'
      }
    }
    
    // Override status if explicitly provided
    if (status && !updateData.status) updateData.status = status
    if (notes !== undefined) updateData.notes = notes
    
    console.log('[company-invoices] Update data:', updateData)
    
    // Make sure we have something to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No update data provided' }, { status: 400 })
    }

    const invoice = await prisma.companyInvoice.update({
      where: { id },
      data: updateData,
      include: {
        company: {
          select: { id: true, name: true, email: true, taxId: true, address: true }
        },
        items: true
      }
    })

    console.log('[company-invoices] Updated invoice:', id, 'paidAmount:', updateData.paidAmount)
    return NextResponse.json({
      ...invoice,
      companyName: invoice.company?.name || 'Unknown',
      total: Number(invoice.total) || 0,
      paidAmount: Number(invoice.paidAmount) || 0
    })
  } catch (error: any) {
    console.error('Error updating invoice:', error)
    return NextResponse.json({ error: 'Failed to update invoice', details: error.message }, { status: 500 })
  }
}

// DELETE - ინვოისის წაშლა
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
      return NextResponse.json({ error: 'Invoice ID required' }, { status: 400 })
    }

    // First delete items
    await prisma.companyInvoiceItem.deleteMany({
      where: { invoiceId: id }
    })

    // Then delete invoice
    await prisma.companyInvoice.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting invoice:', error)
    return NextResponse.json({ error: 'Failed to delete invoice', details: error.message }, { status: 500 })
  }
}