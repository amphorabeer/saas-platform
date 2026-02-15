import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { sendEmail, generateStoreWelcomeEmail } from '@/lib/email'

// Generate unique 4-digit store code
async function generateUniqueStoreCode(): Promise<string> {
  let code: string = ''
  let exists = true

  while (exists) {
    code = Math.floor(1000 + Math.random() * 9000).toString()
    const existing = await prisma.organization.findFirst({
      where: { storeCode: code },
    })
    exists = !!existing
  }

  return code
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

    console.log('📥 Store registration request:', { name, email, organizationName })

    // Validation
    if (!name || !email || !password || !organizationName) {
      return NextResponse.json(
        { error: 'ყველა ველის შევსება აუცილებელია' },
        { status: 400 }
      )
    }

    // Check if email already exists
    const existingUser = await prisma.user.findFirst({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'ეს ელ-ფოსტა უკვე რეგისტრირებულია' },
        { status: 400 }
      )
    }

    // Generate unique store code
    const storeCode = await generateUniqueStoreCode()
    console.log('🔑 Generated store code:', storeCode)

    // Generate slug
    const slug =
      organizationName
        .toLowerCase()
        .replace(/[^a-z0-9\u10D0-\u10FF]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') +
      '-' +
      Date.now()

    // Hash password (save original for email)
    const plainPassword = password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Generate tenantId
    const tenantId = randomUUID()

    // Calculate trial end date (15 days)
    const now = new Date()
    const trialEnd = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000)

    // Create everything in a transaction
    const result = await prisma.$transaction(async (tx: any) => {
      // 1. Create Organization with all store info
      const organization = await tx.organization.create({
        data: {
          name: organizationName,
          slug,
          email,
          phone: phone || null,
          address: address || null,
          logo: null,
          tenantId,
          hotelCode: `SHOP-${storeCode}`, // required field, unique placeholder for store orgs
          storeCode,
          company: company || null,
          taxId: taxId || null,
          city: city || null,
          country: country || 'Georgia',
          website: website || null,
          bankName: bankName || null,
          bankAccount: bankAccount || null,
        },
      })

      // 2. Create User (ORGANIZATION_OWNER)
      const user = await tx.user.create({
        data: {
          email,
          name,
          password: hashedPassword,
          role: 'ORGANIZATION_OWNER',
          organizationId: organization.id,
        },
      })

      // 3. Create Store
      const storeSlug = `${slug}-${organization.id.slice(0, 8)}`
      const store = await tx.store.create({
        data: {
          tenantId: organization.tenantId,
          name: organizationName,
          slug: storeSlug,
          address: address || null,
          phone: phone || null,
          email: email || null,
          taxId: taxId || null,
          currency: 'GEL',
          timezone: 'Asia/Tbilisi',
        },
      })

      // 4. Create StoreEmployee (STORE_OWNER)
      const nameParts = String(name).trim().split(/\s+/)
      const firstName = nameParts[0] || name
      const lastName = nameParts.slice(1).join(' ') || ''

      await tx.storeEmployee.create({
        data: {
          storeId: store.id,
          userId: user.id,
          firstName,
          lastName,
          phone: phone || null,
          email: email || null,
          role: 'STORE_OWNER',
        },
      })

      // 5. Create ModuleAccess (SHOP)
      const moduleType = (module || 'SHOP').toUpperCase()
      await tx.moduleAccess.create({
        data: {
          organizationId: organization.id,
          moduleType: moduleType as any,
          isActive: true,
          maxUsers: 5,
          maxRecords: 1000,
        },
      })

      // 6. Create Subscription
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

      return { organization, user, store }
    })

    console.log('✅ Store registration successful:', {
      organizationId: result.organization.id,
      storeId: result.store.id,
      storeCode: result.organization.storeCode,
    })

    // ========================================
    // Send welcome email
    // ========================================
    try {
      const welcomeHtml = generateStoreWelcomeEmail(
        storeCode,
        organizationName,
        email,
        plainPassword
      )
      await sendEmail({
        to: email,
        subject: 'მოგესალმებით GeoBiz Store-ში! 🏪',
        html: welcomeHtml,
      })
      console.log('✅ [Store Register] Welcome email sent')
    } catch (emailError) {
      console.error('⚠️ [Store Register] Welcome email failed:', emailError)
      // არ ვაბრუნებთ error-ს - მომხმარებელი მაინც დარეგისტრირდა
    }

    return NextResponse.json(
      {
        success: true,
        userId: result.user.id,
        organizationId: result.organization.id,
        storeId: result.store.id,
        tenantId: result.organization.tenantId,
        storeCode: result.organization.storeCode,
        message: `რეგისტრაცია წარმატებით დასრულდა! თქვენი მაღაზიის კოდია: ${storeCode}`,
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('❌ Store registration error:', error)
    return NextResponse.json(
      { error: 'რეგისტრაციის შეცდომა: ' + error.message },
      { status: 500 }
    )
  }
}
