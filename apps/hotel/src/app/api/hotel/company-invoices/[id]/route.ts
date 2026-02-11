// app/api/hotel/company-invoices/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET - ერთი ინვოისის მიღება
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const invoice = await prisma.companyInvoice.findFirst({
      where: { 
        id: params.id,
        tenantId: session.user.tenantId 
      },
      include: {
        company: true,
        items: {
          orderBy: { sortOrder: 'asc' }
        },
        payments: {
          orderBy: { date: 'desc' }
        }
      }
    })

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    return NextResponse.json(invoice)
  } catch (error) {
    console.error('Error fetching company invoice:', error)
    return NextResponse.json({ error: 'Failed to fetch invoice' }, { status: 500 })
  }
}

// PUT - ინვოისის განახლება
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      dueDate, status, subtotal, discount, tax, total, paidAmount,
      notes, items 
    } = body

    // Delete old items if new items provided
    if (items) {
      await prisma.companyInvoiceItem.deleteMany({
        where: { invoiceId: params.id }
      })
    }

    const invoice = await prisma.companyInvoice.update({
      where: { id: params.id },
      data: {
        dueDate: dueDate ? new Date(dueDate) : undefined,
        status: status || undefined,
        subtotal: subtotal !== undefined ? Number(subtotal) : undefined,
        discount: discount !== undefined ? Number(discount) : undefined,
        tax: tax !== undefined ? Number(tax) : undefined,
        total: total !== undefined ? Number(total) : undefined,
        paidAmount: paidAmount !== undefined ? Number(paidAmount) : undefined,
        notes: notes !== undefined ? notes : undefined,
        items: items ? {
          create: items.map((item: any, index: number) => ({
            description: item.description,
            date: item.date ? new Date(item.date) : null,
            quantity: Number(item.quantity || 1),
            unitPrice: Number(item.unitPrice || 0),
            total: Number(item.total || 0),
            reference: item.reference || null,
            sortOrder: index
          }))
        } : undefined
      },
      include: {
        company: true,
        items: true,
        payments: true
      }
    })

    return NextResponse.json(invoice)
  } catch (error) {
    console.error('Error updating company invoice:', error)
    return NextResponse.json({ error: 'Failed to update invoice' }, { status: 500 })
  }
}

// DELETE - ინვოისის წაშლა
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if invoice has payments
    const invoice = await prisma.companyInvoice.findFirst({
      where: { id: params.id },
      include: { _count: { select: { payments: true } } }
    })

    if (invoice?._count.payments && invoice._count.payments > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete invoice with payments. Cancel it instead.' 
      }, { status: 400 })
    }

    await prisma.companyInvoice.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting company invoice:', error)
    return NextResponse.json({ error: 'Failed to delete invoice' }, { status: 500 })
  }
}
