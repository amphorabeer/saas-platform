import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '../../../../prisma/generated/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json()

    if (!token || !password) {
      return NextResponse.json(
        { error: 'ტოკენი და პაროლი სავალდებულოა' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'პაროლი უნდა იყოს მინიმუმ 6 სიმბოლო' },
        { status: 400 }
      )
    }

    // Find user with valid token
    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: {
          gt: new Date(),
        },
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'ბმული არასწორია ან ვადაგასულია' },
        { status: 400 }
      )
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Update password and clear token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    })

    console.log('✅ Password reset successful for:', user.email)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Reset password error:', error)
    return NextResponse.json(
      { error: 'შეცდომა მოხდა' },
      { status: 500 }
    )
  }
}
