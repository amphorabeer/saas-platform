import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'
import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
})

export async function POST(req: NextRequest) {
  try {
    const { email, hotelCode } = await req.json()

    if (!email || !hotelCode) {
      return NextResponse.json(
        { error: 'ელ-ფოსტა და სასტუმროს კოდი სავალდებულოა' },
        { status: 400 }
      )
    }

    // Find organization by hotelCode
    const organization = await prisma.organization.findUnique({
      where: { hotelCode },
    })

    if (!organization) {
      // Don't reveal if organization exists
      return NextResponse.json({ success: true })
    }

    // Find user
    const user = await prisma.user.findFirst({
      where: {
        email,
        organizationId: organization.id,
      },
    })

    if (!user) {
      // Don't reveal if user exists
      return NextResponse.json({ success: true })
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex')
    const resetTokenExpiry = new Date(Date.now() + 3600000) // 1 hour

    // Save token to user
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiry,
      },
    })

    // Send email
    const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${resetToken}`

    await transporter.sendMail({
      from: `"Hotel System" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: 'პაროლის აღდგენა - Hotel System',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">პაროლის აღდგენა</h2>
          <p>გამარჯობა ${user.name || ''},</p>
          <p>თქვენ მოითხოვეთ პაროლის აღდგენა.</p>
          <p>დააჭირეთ ქვემოთ მოცემულ ღილაკს პაროლის შესაცვლელად:</p>
          <a href="${resetUrl}" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">პაროლის აღდგენა</a>
          <p style="color: #666; font-size: 14px;">ეს ბმული მოქმედებს 1 საათის განმავლობაში.</p>
          <p style="color: #666; font-size: 14px;">თუ თქვენ არ მოგითხოვიათ პაროლის აღდგენა, უგულებელყოთ ეს წერილი.</p>
        </div>
      `,
    })

    console.log('✅ Password reset email sent to:', email)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Forgot password error:', error)
    return NextResponse.json(
      { error: 'შეცდომა მოხდა' },
      { status: 500 }
    )
  }
}