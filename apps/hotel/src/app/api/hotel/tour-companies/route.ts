export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'

// GET - ყველა ტურისტული კომპანიის მიღება
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
    const activeOnly = searchParams.get('activeOnly') === 'true'
    const withStats = searchParams.get('withStats') === 'true'

    const where: any = { tenantId }
    if (activeOnly) where.isActive = true

    const companies = await prisma.tourCompany.findMany({
      where,
      include: withStats ? {
        invoices: {
          select: {
            id: true,
            total: true,
            paidAmount: true,
            status: true
          }
        },
        receivables: {
          where: { status: 'pending' },
          select: {
            amount: true,
            paidAmount: true
          }
        }
      } : undefined,
      orderBy: { name: 'asc' }
    })

    // Calculate stats if requested
    if (withStats) {
      const companiesWithStats = companies.map((company: any) => {
        const totalInvoiced = company.invoices?.reduce((sum: number, inv: any) => sum + Number(inv.total), 0) || 0
        const totalPaid = company.invoices?.reduce((sum: number, inv: any) => sum + Number(inv.paidAmount), 0) || 0
        const pendingReceivables = company.receivables?.reduce((sum: number, r: any) => 
          sum + (Number(r.amount) - Number(r.paidAmount)), 0) || 0
        
        return {
          ...company,
          stats: {
            totalInvoiced,
            totalPaid,
            balance: totalInvoiced - totalPaid,
            pendingReceivables
          },
          invoices: undefined,
          receivables: undefined
        }
      })
      return NextResponse.json(companiesWithStats)
    }

    return NextResponse.json(companies)
  } catch (error: any) {
    console.error('Error fetching tour companies:', error)
    return NextResponse.json({ error: 'Failed to fetch companies', details: error.message }, { status: 500 })
  }
}

// POST - ახალი კომპანიის დამატება
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
      name, nameEn, contactPerson, email, phone, address,
      taxId, creditLimit, paymentTerms, discountRate, notes, isActive 
    } = body

    if (!name) {
      return NextResponse.json({ error: 'Company name is required' }, { status: 400 })
    }

    const company = await prisma.tourCompany.create({
      data: {
        tenantId,
        name,
        nameEn: nameEn || null,
        contactPerson: contactPerson || null,
        email: email || null,
        phone: phone || null,
        address: address || null,
        taxId: taxId || null,
        creditLimit: Number(creditLimit || 0),
        paymentTerms: paymentTerms || 30,
        discountRate: Number(discountRate || 0),
        notes: notes || null,
        isActive: isActive ?? true
      }
    })

    return NextResponse.json(company, { status: 201 })
  } catch (error: any) {
    console.error('Error creating tour company:', error)
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Company with this name already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Failed to create company', details: error.message }, { status: 500 })
  }
}

// PUT - კომპანიების bulk update
export async function PUT(request: NextRequest) {
  try {
    const { getTenantId, unauthorizedResponse } = await import('@/lib/tenant')
    const tenantId = await getTenantId()
    
    if (!tenantId) {
      return unauthorizedResponse()
    }
    
    const { getPrismaClient } = await import('@/lib/prisma')
    const prisma = getPrismaClient()

    const body = await request.json()
    
    if (Array.isArray(body)) {
      const results = await Promise.all(
        body.map(async (company: any) => {
          if (company.id && company.id.length > 20) {
            return prisma.tourCompany.update({
              where: { id: company.id },
              data: {
                name: company.name,
                nameEn: company.nameEn || null,
                contactPerson: company.contactPerson || null,
                email: company.email || null,
                phone: company.phone || null,
                address: company.address || null,
                taxId: company.taxId || null,
                creditLimit: Number(company.creditLimit || 0),
                paymentTerms: company.paymentTerms || 30,
                discountRate: Number(company.discountRate || 0),
                notes: company.notes || null,
                isActive: company.isActive ?? true
              }
            })
          } else {
            return prisma.tourCompany.create({
              data: {
                tenantId,
                name: company.name,
                nameEn: company.nameEn || null,
                contactPerson: company.contactPerson || null,
                email: company.email || null,
                phone: company.phone || null,
                address: company.address || null,
                taxId: company.taxId || null,
                creditLimit: Number(company.creditLimit || 0),
                paymentTerms: company.paymentTerms || 30,
                discountRate: Number(company.discountRate || 0),
                notes: company.notes || null,
                isActive: company.isActive ?? true
              }
            })
          }
        })
      )
      return NextResponse.json(results)
    }

    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  } catch (error: any) {
    console.error('Error updating tour companies:', error)
    return NextResponse.json({ error: 'Failed to update companies', details: error.message }, { status: 500 })
  }
}

// DELETE - კომპანიის წაშლა
export async function DELETE(request: NextRequest) {
  try {
    const { getTenantId, unauthorizedResponse } = await import('@/lib/tenant')
    const tenantId = await getTenantId()
    
    if (!tenantId) {
      return unauthorizedResponse()
    }
    
    const { getPrismaClient } = await import('@/lib/prisma')
    const prisma = getPrismaClient()
    
    const url = new URL(request.url)
    const id = url.searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({ error: 'Company ID required' }, { status: 400 })
    }

    // Check if company has invoices or receivables
    const company = await prisma.tourCompany.findFirst({
      where: { id },
      include: {
        _count: {
          select: {
            invoices: true,
            receivables: true
          }
        }
      }
    })

    if (company?._count.invoices || company?._count.receivables) {
      // Soft delete - just deactivate
      await prisma.tourCompany.update({
        where: { id },
        data: { isActive: false }
      })
      return NextResponse.json({ success: true, message: 'Company deactivated (has related records)' })
    }

    await prisma.tourCompany.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting tour company:', error)
    return NextResponse.json({ error: 'Failed to delete company', details: error.message }, { status: 500 })
  }
}
