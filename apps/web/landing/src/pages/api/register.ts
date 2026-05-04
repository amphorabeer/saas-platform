import type { NextApiRequest, NextApiResponse } from 'next'
import { randomUUID } from 'crypto'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '../../../prisma/generated/client'
import { PrismaClient as HotelPmsV2Client } from '../../../prisma-hotel/generated/client'
import { sendEmail, generateHotelWelcomeEmail } from '../../lib/email'

// Super Admin API URL
const SUPER_ADMIN_API_URL = process.env.SUPER_ADMIN_API_URL || 'http://localhost:3001'
// Internal API key for secure communication between services
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || 'internal-api-key-change-in-production'

// Create Prisma client from Landing schema (Organization, Subscription, etc.)
const prisma = new PrismaClient()

const hotelPmsV2 = new HotelPmsV2Client({
  datasources: {
    db: { url: process.env.HOTEL_PMS_V2_DATABASE_URL },
  },
})

// Generate unique 4-digit hotel code
async function generateUniqueHotelCode(): Promise<string> {
  let code: string = ''
  let exists = true
  
  while (exists) {
    code = Math.floor(1000 + Math.random() * 9000).toString()
    const existing = await prisma.organization.findUnique({
      where: { hotelCode: code }
    })
    exists = !!existing
  }
  
  return code
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Handle OPTIONS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  
  try {
    const { 
      name, email, password, organizationName, module, plan,
      company, taxId, address, city, country, phone, website, bankName, bankAccount
    } = req.body

    console.log('📥 Registration request:', { name, email, organizationName })

    // Validation
    if (!name || !email || !password || !organizationName) {
      return res.status(400).json({ error: 'ყველა ველის შევსება აუცილებელია' })
    }

    // Check if email already exists
    const existingUser = await prisma.user.findFirst({
      where: { email }
    })

    if (existingUser) {
      return res.status(400).json({ error: 'ეს ელ-ფოსტა უკვე რეგისტრირებულია' })
    }

    // Generate unique hotel code
    const hotelCode = await generateUniqueHotelCode()
    console.log('🔑 Generated hotel code:', hotelCode)

    // Generate slug
    const slug = organizationName
      .toLowerCase()
      .replace(/[^a-z0-9\u10D0-\u10FF]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') + '-' + Date.now()

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
      // 1. Create Organization with all hotel info
      const organization = await tx.organization.create({
        data: {
          name: organizationName,
          slug,
          email,
          phone: phone || null,
          address: address || null,
          logo: null,
          tenantId,
          hotelCode,
          // Hotel Info fields
          company: company || null,
          taxId: taxId || null,
          city: city || null,
          country: country || 'Georgia',
          website: website || null,
          bankName: bankName || null,
          bankAccount: bankAccount || null,
        }
      })

      // 2. Create User (ORGANIZATION_OWNER)
      const user = await tx.user.create({
        data: {
          email,
          name,
          password: hashedPassword,
          role: 'ORGANIZATION_OWNER',
          organizationId: organization.id,
        }
      })

      // 3. Create ModuleAccess
      const moduleType = (module || 'hotel').toUpperCase()
      await tx.moduleAccess.create({
        data: {
          organizationId: organization.id,
          moduleType: moduleType as any,
          isActive: true,
          maxUsers: 5,
          maxRecords: 1000,
        }
      })

      // 4. Create Subscription (Trial)
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
        }
      })

      return { organization, user }
    })

    console.log('✅ Registration successful:', {
      organizationId: result.organization.id,
      hotelCode: result.organization.hotelCode,
    })

    // ========================================
    // Register in Super Admin (Organization)
    // ========================================
    let superAdminRegistered = false
    let superAdminError: string | null = null

    try {
      const url = `${SUPER_ADMIN_API_URL}/api/organizations`
      console.log('[Hotel Register] Calling Super Admin API:', url)

      const superAdminResponse = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-API-Key': INTERNAL_API_KEY,
        },
        body: JSON.stringify({
          name: organizationName,
          email: email,
          slug: slug,
          plan: plan || 'STARTER',
          status: 'trial',
          modules: ['HOTEL'],
          tenantId: result.organization.tenantId,
          tenantCode: `HOTEL-${hotelCode}`,
          hotelCode: hotelCode,
          company: company || null,
          taxId: taxId || null,
          phone: phone || null,
          address: address || null,
          city: city || null,
          country: country || 'Georgia',
          website: website || null,
          bankName: bankName || null,
          bankAccount: bankAccount || null,
        }),
        signal: AbortSignal.timeout(10000), // 10 second timeout
      })

      if (superAdminResponse.ok) {
        superAdminRegistered = true
        console.log('✅ [Hotel Register] Organization created in Super Admin')
      } else {
        const errorData = await superAdminResponse.json()
        superAdminError = errorData.error || 'Super Admin registration failed'
        console.error('⚠️ [Hotel Register] Super Admin registration failed:', superAdminError)
      }
    } catch (err: any) {
      superAdminError = err.message
      console.error('⚠️ [Hotel Register] Super Admin API call failed:', err.message)
      // არ ვაბრუნებთ error-ს - მომხმარებელი მაინც დარეგისტრირდა
    }

    // ========================================
    // Sync to hotel-pms-v2 database (Pro/Enterprise only)
    // ========================================
    let hotelPmsV2Synced = false
    let hotelPmsV2Error: string | null = null

    const isHotelPro =
      (module || 'hotel').toLowerCase() === 'hotel' &&
      (plan === 'PROFESSIONAL' || plan === 'ENTERPRISE')

    if (isHotelPro) {
      try {
        console.log('🔄 [Hotel PMS v2] Syncing user to hotel-pms-v2 database...')

        await hotelPmsV2.$transaction(async (tx: any) => {
          const v2Org = await tx.organization.create({
            data: {
              name: organizationName,
              slug,
              email,
              phone: phone || null,
              address: address || null,
              city: city || null,
              country: country || 'Georgia',
              company: company || null,
              taxId: taxId || null,
              website: website || null,
              hotelCode,
              tenantId,
              plan: plan || 'PROFESSIONAL',
              trialEnd,
            },
          })

          await tx.user.create({
            data: {
              email,
              name,
              hashedPassword,
              role: 'ADMIN',
              isActive: true,
              organizationId: v2Org.id,
            },
          })
        })

        hotelPmsV2Synced = true
        console.log('✅ [Hotel PMS v2] User synced successfully')
      } catch (err: any) {
        hotelPmsV2Error = err.message
        console.error('⚠️ [Hotel PMS v2] Sync failed:', err.message)
      }
    }

    // ========================================
    // Send welcome email
    // ========================================
    try {
      const welcomeHtml = generateHotelWelcomeEmail(
        hotelCode,
        organizationName,
        email,
        plainPassword
      )
      await sendEmail({
        to: email,
        subject: 'მოგესალმებით GeoBiz Hotel-ში! 🏨',
        html: welcomeHtml,
      })
      console.log('✅ [Hotel Register] Welcome email sent')
    } catch (emailError) {
      console.error('⚠️ [Hotel Register] Welcome email failed:', emailError)
      // არ ვაბრუნებთ error-ს - მომხმარებელი მაინც დარეგისტრირდა
    }

    return res.status(201).json({
      success: true,
      userId: result.user.id,
      organizationId: result.organization.id,
      tenantId: result.organization.tenantId,
      hotelCode: result.organization.hotelCode,
      superAdminRegistered,
      ...(superAdminError && { superAdminWarning: 'ორგანიზაცია ვერ დარეგისტრირდა Super Admin-ში. ეს არ აფერხებს თქვენს მუშაობას.' }),
      message: `რეგისტრაცია წარმატებით დასრულდა! თქვენი სასტუმროს კოდი: ${hotelCode}`
    })

  } catch (error: any) {
    console.error('❌ Registration error:', error)
    return res.status(500).json({ error: 'რეგისტრაციის შეცდომა: ' + error.message })
  }
}

