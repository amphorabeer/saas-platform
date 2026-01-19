import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { isValidTenantCode } from '@/lib/tenant'

const prisma = new PrismaClient()

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { code } = body

    if (!code) {
      return NextResponse.json(
        { valid: false, error: 'Code is required' },
        { status: 400 }
      )
    }

    if (!isValidTenantCode(code)) {
      return NextResponse.json({
        valid: false,
        error: 'Invalid code format. Expected BREW-XXXX',
      })
    }

    const tenant = await prisma.tenant.findUnique({
      where: { code },
      select: {
        id: true,
        name: true,
        slug: true,
        isActive: true,
      },
    })

    if (!tenant) {
      return NextResponse.json({
        valid: false,
        error: 'Tenant not found',
      })
    }

    if (!tenant.isActive) {
      return NextResponse.json({
        valid: false,
        error: 'Tenant is inactive',
      })
    }

    return NextResponse.json({
      valid: true,
      tenant: {
        name: tenant.name,
        slug: tenant.slug,
      },
    })
  } catch (error: any) {
    console.error('[Validate Tenant Code] Error:', error)
    return NextResponse.json(
      { valid: false, error: 'Validation failed', details: error.message },
      { status: 500 }
    )
  }
}
