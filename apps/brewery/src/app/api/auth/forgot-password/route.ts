import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'
import { sendEmail, generatePasswordResetEmail } from '@/lib/email'

const prisma = new PrismaClient()

export async function POST(req: NextRequest) {
  try {
    const { email, tenantCode } = await req.json()

    if (!email || !tenantCode) {
      return NextResponse.json(
        { error: 'ელ-ფოსტა და კომპანიის კოდი სავალდებულოა' },
        { status: 400 }
      )
    }

    // Find tenant
    const tenant = await prisma.tenant.findUnique({
      where: { code: tenantCode },
    })

    if (!tenant) {
      return NextResponse.json(
        { error: 'კომპანია ვერ მოიძებნა' },
        { status: 404 }
      )
    }

    // Find user
    const user = await prisma.user.findFirst({
      where: {
        email,
        tenantId: tenant.id,
      },
    })

    if (!user) {
      // Don't reveal if user exists
      return NextResponse.json({ success: true })
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex')
    const resetTokenExpiry = new Date(Date.now() + 3600000) // 1 hour

    // Save token to user (need to add fields to schema)
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiry,
      },
    })

    // Send email
    const resetUrl = `https://brewery.geobiz.app/reset-password?token=${resetToken}`
    const emailHtml = generatePasswordResetEmail(resetUrl, user.name || 'მომხმარებელო')

    await sendEmail({
      to: email,
      subject: 'პაროლის აღდგენა - BrewMaster PRO',
      html: emailHtml,
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Forgot password error:', error)
    return NextResponse.json(
      { error: 'შეცდომა მოხდა' },
      { status: 500 }
    )
  }
}
