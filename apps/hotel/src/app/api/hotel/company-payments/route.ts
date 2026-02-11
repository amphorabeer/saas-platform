// app/api/hotel/company-payments/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET - გადახდების მიღება
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const invoiceId = searchParams.get('invoiceId')

    const where: any = { tenantId: session.user.tenantId }
    if (companyId) where.companyId = companyId
    if (invoiceId) where.invoiceId = invoiceId

    const payments = await prisma.companyPayment.findMany({
      where,
      include: {
        invoice: {
          select: { id: true, invoiceNumber: true, total: true }
        }
      },
      orderBy: { date: 'desc' }
    })

    return NextResponse.json(payments)
  } catch (error) {
    console.error('Error fetching company payments:', error)
    return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 })
  }
}

// POST - ახალი გადახდის დამატება
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { invoiceId, companyId, amount, method, date, reference, notes } = body

    if (!companyId || amount === undefined) {
      return NextResponse.json({ error: 'Company and amount are required' }, { status: 400 })
    }

    // Create payment
    const payment = await prisma.companyPayment.create({
      data: {
        tenantId: session.user.tenantId,
        invoiceId: invoiceId || null,
        companyId,
        amount: Number(amount),
        method: method || 'bank_transfer',
        date: date ? new Date(date) : new Date(),
        reference: reference || null,
        notes: notes || null,
        createdBy: session.user.id || session.user.email
      }
    })

    // Update invoice paid amount if linked
    if (invoiceId) {
      const invoice = await prisma.companyInvoice.findUnique({
        where: { id: invoiceId },
        include: { payments: true }
      })

      if (invoice) {
        const totalPaid = invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0)
        const newStatus = totalPaid >= Number(invoice.total) ? 'paid' : 
                         totalPaid > 0 ? 'partial' : invoice.status

        await prisma.companyInvoice.update({
          where: { id: invoiceId },
          data: {
            paidAmount: totalPaid,
            status: newStatus
          }
        })
      }
    }

    return NextResponse.json(payment, { status: 201 })
  } catch (error) {
    console.error('Error creating company payment:', error)
    return NextResponse.json({ error: 'Failed to create payment' }, { status: 500 })
  }
}

// DELETE - გადახდის წაშლა
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const paymentId = searchParams.get('id')

    if (!paymentId) {
      return NextResponse.json({ error: 'Payment ID is required' }, { status: 400 })
    }

    const payment = await prisma.companyPayment.findFirst({
      where: { id: paymentId, tenantId: session.user.tenantId }
    })

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    await prisma.companyPayment.delete({
      where: { id: paymentId }
    })

    // Recalculate invoice paid amount if linked
    if (payment.invoiceId) {
      const invoice = await prisma.companyInvoice.findUnique({
        where: { id: payment.invoiceId },
        include: { payments: true }
      })

      if (invoice) {
        const totalPaid = invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0)
        const newStatus = totalPaid >= Number(invoice.total) ? 'paid' : 
                         totalPaid > 0 ? 'partial' : 'pending'

        await prisma.companyInvoice.update({
          where: { id: payment.invoiceId },
          data: {
            paidAmount: totalPaid,
            status: newStatus
          }
        })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting company payment:', error)
    return NextResponse.json({ error: 'Failed to delete payment' }, { status: 500 })
  }
}
