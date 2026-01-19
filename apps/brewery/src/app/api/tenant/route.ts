import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET - Tenant მონაცემების წამოღება
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenantId = (session.user as any).tenantId
    
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 404 })
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        code: true,
        slug: true,
        plan: true,
        legalName: true,
        taxId: true,
        phone: true,
        email: true,
        address: true,
        website: true,
        bankName: true,
        bankAccount: true,
        bankSwift: true,
        createdAt: true,
      },
    })

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    return NextResponse.json({ tenant })
  } catch (error: any) {
    console.error('[Tenant GET] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tenant', details: error.message },
      { status: 500 }
    )
  }
}

// PUT - Tenant მონაცემების განახლება
export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenantId = (session.user as any).tenantId
    const userRole = (session.user as any).role
    
    // მხოლოდ OWNER და ADMIN-ს შეუძლია
    if (!['OWNER', 'ADMIN'].includes(userRole)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    const body = await req.json()

    const tenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        name: body.name,
        legalName: body.legalName,
        taxId: body.taxId,
        phone: body.phone,
        email: body.email,
        address: body.address,
        website: body.website,
        bankName: body.bankName,
        bankAccount: body.bankAccount,
        bankSwift: body.bankSwift,
      },
    })

    return NextResponse.json({ success: true, tenant })
  } catch (error: any) {
    console.error('[Tenant PUT] Error:', error)
    return NextResponse.json(
      { error: 'Failed to update tenant', details: error.message },
      { status: 500 }
    )
  }
}
