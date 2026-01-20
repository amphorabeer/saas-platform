import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { generateTenantCode, generateSlug } from '@/lib/tenant'
import { sendEmail, generateWelcomeEmail } from '@/lib/email'
import { z } from 'zod'

const prisma = new PrismaClient()

// Super Admin API URL (production-ში environment variable იქნება)
const SUPER_ADMIN_API_URL = process.env.SUPER_ADMIN_API_URL || 'http://localhost:3001'
// Internal API key for secure communication between services
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || 'internal-api-key-change-in-production'

const registerSchema = z.object({
  // პირადი ინფორმაცია
  name: z.string().min(2, 'სახელი უნდა იყოს მინიმუმ 2 სიმბოლო'),
  email: z.string().email('არასწორი ელ-ფოსტა'),
  password: z.string().min(6, 'პაროლი უნდა იყოს მინიმუმ 6 სიმბოლო'),
  // ლუდსახარშის ინფორმაცია
  breweryName: z.string().min(2, 'ლუდსახარშის სახელი სავალდებულოა'),
  company: z.string().min(2, 'კომპანიის სახელი სავალდებულოა'),
  taxId: z.string().min(1, 'საიდენტიფიკაციო კოდი სავალდებულოა'),
  phone: z.string().min(1, 'ტელეფონი სავალდებულოა'),
  address: z.string().min(1, 'მისამართი სავალდებულოა'),
  city: z.string().min(1, 'ქალაქი სავალდებულოა'),
  country: z.string().default('Georgia'),
  website: z.string().optional(),
  // საბანკო ინფორმაცია
  bankName: z.string().optional(),
  bankAccount: z.string().optional(),
  bankSwift: z.string().optional(),
  // Plan from pricing page
  plan: z.enum(['STARTER', 'PROFESSIONAL', 'ENTERPRISE']).default('STARTER'),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const validated = registerSchema.parse(body)

    // ========================================
    // 1. Generate unique tenant code (BREW-XXXX)
    // ========================================
    let tenantCode = generateTenantCode()
    let attempts = 0
    while (await prisma.tenant.findUnique({ where: { code: tenantCode } })) {
      tenantCode = generateTenantCode()
      attempts++
      if (attempts > 10) {
        return NextResponse.json(
          { error: 'ვერ მოხერხდა უნიკალური კოდის გენერაცია' },
          { status: 500 }
        )
      }
    }

    // ========================================
    // 2. Generate slug
    // ========================================
    let slug = generateSlug(validated.breweryName)
    let slugAttempts = 0
    while (await prisma.tenant.findUnique({ where: { slug } })) {
      slug = `${generateSlug(validated.breweryName)}-${Date.now()}`
      slugAttempts++
      if (slugAttempts > 10) {
        return NextResponse.json(
          { error: 'ვერ მოხერხდა უნიკალური slug-ის გენერაცია' },
          { status: 500 }
        )
      }
    }

    // ========================================
    // 3. Hash password
    // ========================================
    const hashedPassword = await bcrypt.hash(validated.password, 10)

    // Build full address
    const fullAddress = `${validated.address}, ${validated.city}, ${validated.country}`

    // ========================================
    // 4. Create Tenant and User in Neon DB (Transaction)
    // ========================================
    const result = await prisma.$transaction(async (tx) => {
      // Create tenant with all company info
      const tenant = await tx.tenant.create({
        data: {
          name: validated.breweryName,
          code: tenantCode,
          slug,
          plan: validated.plan,
          isActive: true,
          // კომპანიის დეტალები
          legalName: validated.company,
          taxId: validated.taxId,
          phone: validated.phone,
          email: validated.email,
          address: fullAddress,
          website: validated.website || null,
          // საბანკო ინფორმაცია
          bankName: validated.bankName || null,
          bankAccount: validated.bankAccount || null,
          bankSwift: validated.bankSwift || null,
        },
      })

      // Create user with OWNER role
      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          email: validated.email,
          name: validated.name,
          password: hashedPassword,
          role: 'OWNER',
          isActive: true,
        },
      })

      return { tenant, user }
    })

    // ========================================
    // 5. Register in Super Admin (Organization)
    // ========================================
    let superAdminRegistered = false
    let superAdminError = null

    try {
      const url = `${SUPER_ADMIN_API_URL}/api/organizations`
      console.log('[Register] Calling Super Admin API:', url)
      
      const superAdminResponse = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-API-Key': INTERNAL_API_KEY,
        },
        body: JSON.stringify({
          name: validated.breweryName,
          email: validated.email,
          slug: slug,
          plan: validated.plan,
          status: 'trial',
          modules: ['BREWERY'],
          tenantId: result.tenant.id,
          tenantCode: tenantCode,
          company: validated.company,
          taxId: validated.taxId,
          phone: validated.phone,
          address: fullAddress,
          city: validated.city,
          country: validated.country,
          website: validated.website,
          bankName: validated.bankName,
          bankAccount: validated.bankAccount,
        }),
        signal: AbortSignal.timeout(10000), // 10 second timeout
      })

      if (superAdminResponse.ok) {
        superAdminRegistered = true
        console.log('✅ [Register] Organization created in Super Admin')
      } else {
        const errorData = await superAdminResponse.json()
        superAdminError = errorData.error || 'Super Admin registration failed'
        console.error('⚠️ [Register] Super Admin registration failed:', superAdminError)
      }
    } catch (error: any) {
      superAdminError = error.message
      console.error('⚠️ [Register] Super Admin API call failed:', error.message)
      // არ ვაბრუნებთ error-ს - მომხმარებელი მაინც დარეგისტრირდა Neon-ში
      // Super Admin sync შეიძლება მოგვიანებით მოხდეს
    }

    // ========================================
    // 6. Send welcome email
    // ========================================
    try {
      const welcomeHtml = generateWelcomeEmail(tenantCode, validated.name, validated.email, validated.password)
      await sendEmail({
        to: validated.email,
        subject: 'მოგესალმებით BrewMaster PRO-ში! 🍺',
        html: welcomeHtml,
      })
      console.log('✅ [Register] Welcome email sent')
    } catch (emailError) {
      console.error('⚠️ [Register] Welcome email failed:', emailError)
    }

    // ========================================
    // 7. Return success response
    // ========================================
    return NextResponse.json({
      success: true,
      tenant: {
        id: result.tenant.id,
        name: result.tenant.name,
        code: result.tenant.code,
        slug: result.tenant.slug,
      },
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        role: result.user.role,
      },
      // დამატებითი ინფორმაცია
      superAdminRegistered,
      ...(superAdminError && { superAdminWarning: 'ორგანიზაცია ვერ დარეგისტრირდა Super Admin-ში. ეს არ აფერხებს თქვენს მუშაობას.' }),
    })

  } catch (error: any) {
    console.error('[Register] Error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'ვალიდაციის შეცდომა', details: error.errors },
        { status: 400 }
      )
    }

    // Check for unique constraint violation
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'ეს ელ-ფოსტა უკვე რეგისტრირებულია' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'რეგისტრაცია ვერ მოხერხდა', details: error.message },
      { status: 500 }
    )
  }
}
