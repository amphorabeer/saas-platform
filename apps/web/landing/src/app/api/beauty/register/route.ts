import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { prisma } from '@/lib/prisma'
import { getBeautyPool } from '@/lib/beauty-db'
import bcrypt from 'bcryptjs'

async function generateUniqueBeautyCode(): Promise<string> {
  let code: string = ''
  let exists = true

  while (exists) {
    code = Math.floor(1000 + Math.random() * 9000).toString()
    const existing = await prisma.organization.findFirst({
      where: { beautyCode: code },
    })
    exists = !!existing
  }

  return code
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[ა-ჰ]/g, (c: string) => {
      const map: Record<string, string> = {
        'ა':'a','ბ':'b','გ':'g','დ':'d','ე':'e','ვ':'v','ზ':'z','თ':'t','ი':'i',
        'კ':'k','ლ':'l','მ':'m','ნ':'n','ო':'o','პ':'p','ჟ':'zh','რ':'r','ს':'s',
        'ტ':'t','უ':'u','ფ':'f','ქ':'q','ღ':'gh','ყ':'y','შ':'sh','ჩ':'ch',
        'ც':'ts','ძ':'dz','წ':'w','ჭ':'ch','ხ':'kh','ჯ':'j','ჰ':'h',
      }
      return map[c] || c
    })
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      name,
      email,
      password,
      organizationName,
      module,
      plan,
      company,
      taxId,
      address,
      city,
      country,
      phone,
      website,
      bankName,
      bankAccount,
    } = body

    console.log('💅 Beauty registration request:', { name, email, organizationName })

    if (!name || !email || !password || !organizationName) {
      return NextResponse.json(
        { error: 'ყველა ველის შევსება აუცილებელია' },
        { status: 400 }
      )
    }

    // Check if email already exists in super-admin
    const existingUser = await prisma.user.findFirst({
      where: { email },
      include: { organization: true },
    })

    if (existingUser?.organization?.beautyCode) {
      return NextResponse.json(
        { error: 'ეს ელ-ფოსტა უკვე რეგისტრირებულია სალონის მოდულში' },
        { status: 400 }
      )
    }

    const beautyCode = await generateUniqueBeautyCode()
    const slug = generateSlug(organizationName) + '-' + Date.now()
    const hashedPassword = await bcrypt.hash(password, 10)
    const tenantId = randomUUID()
    const now = new Date()
    const trialEnd = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000)

    // 1. Create in super-admin DB (organization, user, moduleAccess, subscription)
    let result: any

    if (existingUser && existingUser.organizationId && existingUser.organization) {
      // Existing user — add beauty module to their org
      result = await prisma.$transaction(async (tx: any) => {
        const organization = await tx.organization.update({
          where: { id: existingUser.organizationId },
          data: { beautyCode },
        })

        const existingModule = await tx.moduleAccess.findFirst({
          where: { organizationId: organization.id, moduleType: 'BEAUTY' },
        })
        if (!existingModule) {
          await tx.moduleAccess.create({
            data: {
              organizationId: organization.id,
              moduleType: 'BEAUTY',
              isActive: true,
              maxUsers: 10,
              maxRecords: 5000,
            },
          })
        }

        return { organization, user: existingUser, isExisting: true }
      })
    } else {
      // New user
      result = await prisma.$transaction(async (tx: any) => {
        const organization = await tx.organization.create({
          data: {
            name: organizationName,
            slug,
            email,
            phone: phone || null,
            address: address || null,
            tenantId,
            hotelCode: `BEAUTY-${beautyCode}`,
            beautyCode,
            company: company || null,
            taxId: taxId || null,
            city: city || null,
            country: country || 'Georgia',
            website: website || null,
            bankName: bankName || null,
            bankAccount: bankAccount || null,
          },
        })

        const user = await tx.user.create({
          data: {
            email,
            name,
            password: hashedPassword,
            role: 'ORGANIZATION_OWNER',
            organizationId: organization.id,
          },
        })

        await tx.moduleAccess.create({
          data: {
            organizationId: organization.id,
            moduleType: 'BEAUTY',
            isActive: true,
            maxUsers: 10,
            maxRecords: 5000,
          },
        })

        await tx.subscription.create({
          data: {
            organizationId: organization.id,
            plan: (plan || 'STARTER') as any,
            status: 'TRIAL',
            price: 0,
            currentPeriodStart: now,
            currentPeriodEnd: trialEnd,
            trialStart: now,
            trialEnd: trialEnd,
          },
        })

        return { organization, user, isExisting: false }
      })
    }

    // 2. Create salon + user in Beauty DB
    const beautyPool = getBeautyPool()
    const salonId = randomUUID().replace(/-/g, '').slice(0, 25)
    const beautyUserId = randomUUID().replace(/-/g, '').slice(0, 25)
    const salonSlug = generateSlug(organizationName) + '-' + beautyCode

    try {
      // Create Salon
      await beautyPool.query(
        `INSERT INTO salons ("id", "name", "slug", "address", "phone", "email", "workingHours", "settings", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
        [
          salonId,
          organizationName,
          salonSlug,
          address || null,
          phone || null,
          email,
          JSON.stringify({
            monday: { open: '10:00', close: '20:00', isOff: false },
            tuesday: { open: '10:00', close: '20:00', isOff: false },
            wednesday: { open: '10:00', close: '20:00', isOff: false },
            thursday: { open: '10:00', close: '20:00', isOff: false },
            friday: { open: '10:00', close: '20:00', isOff: false },
            saturday: { open: '10:00', close: '20:00', isOff: false },
            sunday: { open: '10:00', close: '20:00', isOff: true },
          }),
          JSON.stringify({ loyaltyPointsPerGel: 10, autoLoyalty: true }),
        ]
      )

      // Create Staff (owner) in beauty DB
      await beautyPool.query(
        `INSERT INTO staff ("id", "salonId", "name", "email", "role", "passwordHash", "commissionType", "commissionRate", "isActive", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, 'OWNER', $5, 'NONE', 0, true, NOW(), NOW())`,
        [beautyUserId, salonId, name, email, hashedPassword]
      )

      // Create default service categories
      const categories = [
        { name: 'თმის მომსახურება', color: '#8B5CF6', sortOrder: 1 },
        { name: 'ფრჩხილის მომსახურება', color: '#EC4899', sortOrder: 2 },
        { name: 'სახის მოვლა', color: '#10B981', sortOrder: 3 },
        { name: 'სხეულის მოვლა', color: '#F59E0B', sortOrder: 4 },
      ]
      for (const cat of categories) {
        const catId = randomUUID().replace(/-/g, '').slice(0, 25)
        await beautyPool.query(
          `INSERT INTO service_categories ("id", "salonId", "name", "color", "sortOrder", "isActive", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())`,
          [catId, salonId, cat.name, cat.color, cat.sortOrder]
        )
      }

      console.log('💅 Beauty salon created in beauty DB:', { salonId, salonSlug })
    } catch (beautyDbError: any) {
      console.error('💅 Beauty DB error (salon still registered in super-admin):', beautyDbError?.message)
    }

    const beautyBase = (process.env.NEXT_PUBLIC_BEAUTY_URL || 'https://beauty.geobiz.app').replace(/\/$/, '')
    const loginUrl = `${beautyBase.startsWith('http') ? beautyBase : `https://${beautyBase}`}/auth/login`

    // Send welcome email
    try {
      const { sendEmail } = await import('@/lib/email')
      await sendEmail({
        to: email,
        subject: 'მოგესალმებით BeautySalon PRO-ში! 💅',
        html: `
          <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
            <h2>მოგესალმებით BeautySalon PRO-ში! 💅</h2>
            <p>თქვენი სალონის სისტემა მზადაა.</p>
            <div style="background: #f0f4ff; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
              <p style="color: #666; margin: 0 0 8px;">სალონის კოდი:</p>
              <div style="font-size: 32px; font-weight: bold; color: #2563eb; letter-spacing: 4px;">${beautyCode}</div>
            </div>
            <p><strong>ელ-ფოსტა:</strong> ${email}</p>
            <p><a href="${loginUrl}" style="display: inline-block; background: #8B5CF6; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none;">შესვლა სისტემაში</a></p>
            <p style="color: #999; font-size: 12px;">GeoBiz.app</p>
          </div>
        `,
      })
      console.log('💅 Welcome email sent')
    } catch (e) {
      console.error('💅 Email failed:', e)
    }

    console.log('💅 Beauty registration successful:', {
      organizationId: result.organization.id,
      beautyCode,
      salonId,
    })

    return NextResponse.json(
      {
        success: true,
        beautyCode,
        salonId,
        message: `რეგისტრაცია წარმატებით დასრულდა! თქვენი სალონის კოდია: ${beautyCode}`,
        loginUrl,
      },
      { status: 201 }
    )
  } catch (error: any) {
    const message = error?.message ?? String(error)
    console.error('💅 Beauty registration error:', message, error)
    return NextResponse.json(
      { error: 'რეგისტრაციის შეცდომა: ' + message },
      { status: 500 }
    )
  }
}
