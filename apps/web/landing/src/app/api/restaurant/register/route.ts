import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { sendEmail, generateRestaurantWelcomeEmail } from '@/lib/email'

async function generateUniqueRestCode(): Promise<string> {
  let code: string = ''
  let exists = true

  while (exists) {
    code = Math.floor(1000 + Math.random() * 9000).toString()
    const existing = await prisma.organization.findFirst({
      where: { restCode: code },
    })
    exists = !!existing
  }

  return code
}

const DEFAULT_CATEGORIES = [
  { name: 'სალათები🥗', sortOrder: 1 },
  { name: 'ძირითადი🍖', sortOrder: 2 },
  { name: 'პიცა🍕', sortOrder: 3 },
  { name: 'დესერტი🍰', sortOrder: 4 },
  { name: 'სასმელები🥤', sortOrder: 5 },
  { name: 'ღვინო🍷', sortOrder: 6 },
]

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
      restaurantType,
    } = body

    console.log('🍽️ Restaurant registration request:', { name, email, organizationName })

    if (!name || !email || !password || !organizationName) {
      return NextResponse.json(
        { error: 'ყველა ველის შევსება აუცილებელია' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: { email },
      include: { organization: true },
    })

    // If user exists, check if they already have a restaurant
    if (existingUser) {
      // Check if user has organization
      if (!existingUser.organizationId || !existingUser.organization) {
        return NextResponse.json(
          { error: 'მომხმარებელს არ აქვს ორგანიზაცია მიბმული. გთხოვთ დარეგისტრირდეთ ახალი ელ-ფოსტით.' },
          { status: 400 }
        )
      }

      // Check if organization already has restCode
      if (existingUser.organization.restCode) {
        return NextResponse.json(
          { error: 'ეს ელ-ფოსტა უკვე რეგისტრირებულია რესტორნის მოდულში' },
          { status: 400 }
        )
      }

      // User exists but doesn't have restaurant — add restaurant to existing organization
      const restCode = await generateUniqueRestCode()

      const result = await prisma.$transaction(async (tx: any) => {
        // Update organization with restCode
        const organization = await tx.organization.update({
          where: { id: existingUser.organizationId },
          data: { restCode },
        })

        // Create Restaurant
        const restaurantSlug = `rest-${organization.slug}-${organization.id.slice(0, 8)}`
        const restaurant = await tx.restaurant.create({
          data: {
            tenantId: organization.tenantId,
            name: organizationName || organization.name,
            slug: restaurantSlug,
            type: restaurantType || 'restaurant',
            address: organization.address || address || null,
            phone: organization.phone || phone || null,
            email: email,
            currency: 'GEL',
            timezone: 'Asia/Tbilisi',
          },
        })

        // Create RestaurantEmployee
        const nameParts = String(existingUser.name || name).trim().split(/\s+/)
        const firstName = nameParts[0] || 'User'
        const lastName = nameParts.slice(1).join(' ') || ''

        await tx.restaurantEmployee.create({
          data: {
            restaurantId: restaurant.id,
            userId: existingUser.id,
            firstName,
            lastName,
            phone: organization.phone || phone || null,
            email: email,
            role: 'RESTAURANT_OWNER',
          },
        })

        // Add RESTAURANT module access if not exists
        const existingModule = await tx.moduleAccess.findFirst({
          where: { organizationId: organization.id, moduleType: 'RESTAURANT' },
        })
        if (!existingModule) {
          await tx.moduleAccess.create({
            data: {
              organizationId: organization.id,
              moduleType: 'RESTAURANT',
              isActive: true,
              maxUsers: 10,
              maxRecords: 5000,
            },
          })
        }

        // Create default zone and tables
        const defaultZone = await tx.restaurantZone.create({
          data: {
            restaurantId: restaurant.id,
            name: 'ძირითადი დარბაზი',
            color: '#6366F1',
            sortOrder: 0,
          },
        })

        for (let i = 1; i <= 5; i++) {
          await tx.$executeRawUnsafe(`
            INSERT INTO "RestaurantTable" ("id", "restaurantId", "zoneId", "number", "seats", "shape", "status", "posX", "posY", "width", "height", "rotation", "isActive", "createdAt", "updatedAt")
            VALUES (gen_random_uuid()::text, $1, $2, $3, 4, 'SQUARE', 'FREE', $4, 100, 80, 80, 0, true, NOW(), NOW())
          `, restaurant.id, defaultZone.id, `T${i}`, 50 + (i - 1) * 120)
        }

        // Create default menu categories
        const defaultCategories = [
          { name: 'სალათები', nameEn: 'Salads', icon: '🥗', color: '#10B981', sortOrder: 0 },
          { name: 'ძირითადი', nameEn: 'Main Courses', icon: '🍖', color: '#F97316', sortOrder: 1 },
          { name: 'პიცა', nameEn: 'Pizza', icon: '🍕', color: '#EF4444', sortOrder: 2 },
          { name: 'დესერტი', nameEn: 'Desserts', icon: '🎂', color: '#EC4899', sortOrder: 3 },
          { name: 'სასმელები', nameEn: 'Drinks', icon: '🥤', color: '#3B82F6', sortOrder: 4 },
          { name: 'ღვინო', nameEn: 'Wine', icon: '🍷', color: '#7C3AED', sortOrder: 5 },
        ]

        for (const cat of defaultCategories) {
          await tx.menuCategory.create({
            data: { restaurantId: restaurant.id, ...cat },
          })
        }

        return { organization, restaurant }
      })

      // Send welcome email
      try {
        const welcomeHtml = generateRestaurantWelcomeEmail(restCode, organizationName || result.organization.name, email, '(არსებული პაროლი)')
        await sendEmail({ to: email, subject: 'RestoPOS დაემატა თქვენს ანგარიშს! 🍽️', html: welcomeHtml })
      } catch (e) { console.error('Email failed:', e) }

      return NextResponse.json({
        success: true,
        restCode,
        restaurantId: result.restaurant.id,
        message: `რესტორანი დაემატა თქვენს ანგარიშს! კოდი: ${restCode}`,
      }, { status: 201 })
    }

    const restCode = await generateUniqueRestCode()
    console.log('🍽️ Generated rest code:', restCode)

    const slug =
      organizationName
        .toLowerCase()
        .replace(/[^a-z0-9\u10D0-\u10FF]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') +
      '-' +
      Date.now()

    const plainPassword = password
    const hashedPassword = await bcrypt.hash(password, 10)
    const tenantId = randomUUID()
    const now = new Date()
    const trialEnd = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000)
    const type = restaurantType === 'cafe' || restaurantType === 'bar' ? restaurantType : 'restaurant'

    const result = await prisma.$transaction(async (tx: any) => {
      const organization = await tx.organization.create({
        data: {
          name: organizationName,
          slug,
          email,
          phone: phone || null,
          address: address || null,
          logo: null,
          tenantId,
          hotelCode: `REST-${restCode}`,
          restCode,
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

      const restaurantSlug = `${slug}-${organization.id.slice(0, 8)}`
      const restaurant = await tx.restaurant.create({
        data: {
          tenantId: organization.tenantId,
          name: organizationName,
          slug: restaurantSlug,
          type,
          address: address || null,
          phone: phone || null,
          email: email || null,
          taxId: taxId || null,
          currency: 'GEL',
          timezone: 'Asia/Tbilisi',
        },
      })

      const nameParts = String(name).trim().split(/\s+/)
      const firstName = nameParts[0] || name
      const lastName = nameParts.slice(1).join(' ') || ''

      await tx.restaurantEmployee.create({
        data: {
          restaurantId: restaurant.id,
          userId: user.id,
          firstName,
          lastName,
          phone: phone || null,
          email: email || null,
          role: 'RESTAURANT_OWNER',
        },
      })

      const zone = await tx.restaurantZone.create({
        data: {
          restaurantId: restaurant.id,
          name: 'ძირითადი დარბაზი',
          sortOrder: 0,
        },
      })

      for (let i = 1; i <= 5; i++) {
        await tx.$executeRawUnsafe(`
          INSERT INTO "RestaurantTable" ("id", "restaurantId", "zoneId", "number", "seats", "shape", "status", "posX", "posY", "width", "height", "rotation", "isActive", "createdAt", "updatedAt")
          VALUES (gen_random_uuid()::text, $1, $2, $3, 4, 'SQUARE', 'FREE', $4, 100, 80, 80, 0, true, NOW(), NOW())
        `, restaurant.id, zone.id, `T${i}`, 50 + (i - 1) * 120)
      }

      for (const cat of DEFAULT_CATEGORIES) {
        await tx.menuCategory.create({
          data: {
            restaurantId: restaurant.id,
            name: cat.name,
            sortOrder: cat.sortOrder,
          },
        })
      }

      await tx.moduleAccess.create({
        data: {
          organizationId: organization.id,
          moduleType: 'RESTAURANT',
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

      return { organization, user, restaurant }
    })

    console.log('🍽️ Restaurant registration successful:', {
      organizationId: result.organization.id,
      restaurantId: result.restaurant.id,
      restCode: result.organization.restCode,
    })

    try {
      const welcomeHtml = generateRestaurantWelcomeEmail(
        restCode,
        organizationName,
        email,
        plainPassword
      )
      await sendEmail({
        to: email,
        subject: 'მოგესალმებით GeoBiz RestoPOS-ში! 🍽️',
        html: welcomeHtml,
      })
      console.log('🍽️ [Restaurant Register] Welcome email sent')
    } catch (emailError) {
      console.error('🍽️ [Restaurant Register] Welcome email failed:', emailError)
    }

    return NextResponse.json(
      {
        success: true,
        userId: result.user.id,
        organizationId: result.organization.id,
        restaurantId: result.restaurant.id,
        tenantId: result.organization.tenantId,
        restCode: result.organization.restCode,
        message: `რეგისტრაცია წარმატებით დასრულდა! თქვენი რესტორნის კოდია: ${restCode}`,
      },
      { status: 201 }
    )
  } catch (error: any) {
    const message = error?.message ?? String(error)
    const code = error?.code ?? ''
    console.error('🍽️ Restaurant registration error:', message, code, error)
    // Helpful message if DB tables are missing (run: npx prisma migrate dev or npx prisma db push)
    const isPrismaTableError =
      code === 'P2021' ||
      /relation|table|does not exist|Unknown table/i.test(message)
    const userMessage = isPrismaTableError
      ? 'ბაზაში ცხრილები არ არის. გაუშვით: npx prisma migrate dev ან npx prisma db push (apps/web/landing)'
      : 'რეგისტრაციის შეცდომა: ' + message
    return NextResponse.json(
      { error: userMessage, details: process.env.NODE_ENV === 'development' ? message : undefined },
      { status: 500 }
    )
  }
}
