import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { config } from 'dotenv'
import { resolve } from 'path'

// Load .env file
config({ path: resolve(__dirname, '../.env') })

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database with raw SQL...')

  // Check if data already exists
  const existingUsers = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*) as count FROM "User"
  `
  if (existingUsers[0].count > BigInt(0)) {
    console.log('⚠️  Database already seeded. Skipping...')
    return
  }

  // Hash password
  const hashedPassword = await bcrypt.hash('admin123', 10)

  // Create Super Admin using raw SQL
  await prisma.$executeRawUnsafe(`
    INSERT INTO "User" (id, email, name, password, role, "emailVerified", "createdAt", "updatedAt")
    VALUES (gen_random_uuid()::text, 'admin@platform.ge', 'Super Admin', $1, 'SUPER_ADMIN', NOW(), NOW(), NOW())
  `, hashedPassword)

  console.log('✅ Created super admin')

  // Create Module Configurations
  const modules = [
    {
      moduleType: 'HOTEL',
      name: 'სასტუმროს მართვა',
      nameEn: 'Hotel Management',
      description: 'სრულყოფილი PMS სისტემა სასტუმროებისთვის',
      descriptionEn: 'Complete PMS system for hotels',
      icon: '🏨',
      color: '#3b82f6',
      displayOrder: 1,
      starterPrice: 0,
      starterFeatures: ['1 ლოკაცია', '20 ნომერი', 'ძირითადი ფუნქციები'],
      professionalPrice: 99,
      professionalFeatures: ['1 ლოკაცია', '50 ნომერი', 'ყველა ფუნქცია', '24/7 მხარდაჭერა'],
      enterprisePrice: 299,
      enterpriseFeatures: ['მრავალი ლოკაცია', 'ულიმიტო ნომერი', 'Custom features', 'Dedicated support'],
      activeOrganizations: 124,
      totalUsers: 3248
    },
    {
      moduleType: 'RESTAURANT',
      name: 'რესტორნის მართვა',
      nameEn: 'Restaurant Management',
      description: 'რესტორნის სრული მართვის სისტემა',
      descriptionEn: 'Complete restaurant management system',
      icon: '🍽️',
      color: '#10b981',
      displayOrder: 2,
      starterPrice: 0,
      starterFeatures: ['1 ლოკაცია', '10 მაგიდა', 'POS სისტემა'],
      professionalPrice: 99,
      professionalFeatures: ['1 ლოკაცია', '30 მაგიდა', 'Kitchen Display', 'Inventory'],
      enterprisePrice: 299,
      enterpriseFeatures: ['მრავალი ლოკაცია', 'ულიმიტო მაგიდა', 'Analytics', 'API access'],
      activeOrganizations: 89,
      totalUsers: 2156
    },
    {
      moduleType: 'BEAUTY',
      name: 'სილამაზის სალონი',
      nameEn: 'Beauty Salon',
      description: 'სალონის მართვის სრული სისტემა',
      descriptionEn: 'Complete salon management system',
      icon: '💅',
      color: '#ec4899',
      displayOrder: 3,
      starterPrice: 0,
      starterFeatures: ['1 სალონი', '3 მასტერი', 'ჯავშნები'],
      professionalPrice: 99,
      professionalFeatures: ['1 სალონი', '10 მასტერი', 'SMS შეხსენებები', 'Loyalty'],
      enterprisePrice: 299,
      enterpriseFeatures: ['მრავალი სალონი', 'ულიმიტო მასტერი', 'Marketing tools', 'Reports'],
      activeOrganizations: 67,
      totalUsers: 1823
    },
    {
      moduleType: 'SHOP',
      name: 'მაღაზია',
      nameEn: 'Shop',
      description: 'მაღაზიის მართვის სისტემა',
      descriptionEn: 'Shop management system',
      icon: '🛍️',
      color: '#8b5cf6',
      displayOrder: 4,
      starterPrice: 0,
      starterFeatures: ['1 მაღაზია', '500 პროდუქტი', 'POS'],
      professionalPrice: 99,
      professionalFeatures: ['1 მაღაზია', '5000 პროდუქტი', 'Inventory', 'Barcode'],
      enterprisePrice: 299,
      enterpriseFeatures: ['ქსელი', 'ულიმიტო პროდუქტი', 'E-commerce', 'Warehouse'],
      activeOrganizations: 156,
      totalUsers: 4521
    },
    {
      moduleType: 'BREWERY',
      name: 'ლუდსახარში',
      nameEn: 'Brewery',
      description: 'ლუდის წარმოების მართვა',
      descriptionEn: 'Brewery management',
      icon: '🍺',
      color: '#f59e0b',
      displayOrder: 5,
      starterPrice: 0,
      starterFeatures: ['10 რეცეპტი', 'წარმოება', 'ინვენტარი'],
      professionalPrice: 149,
      professionalFeatures: ['50 რეცეპტი', 'ავტომატიზაცია', 'Quality control', 'Distribution'],
      enterprisePrice: 399,
      enterpriseFeatures: ['ულიმიტო რეცეპტი', 'Multi-location', 'Compliance', 'Analytics'],
      activeOrganizations: 23,
      totalUsers: 412
    },
    {
      moduleType: 'WINERY',
      name: 'ღვინის მარანი',
      nameEn: 'Winery',
      description: 'ღვინის წარმოების მართვა',
      descriptionEn: 'Winery management',
      icon: '🍷',
      color: '#dc2626',
      displayOrder: 6,
      starterPrice: 0,
      starterFeatures: ['ვენახი', 'რთველი', 'დავარგება'],
      professionalPrice: 149,
      professionalFeatures: ['მრავალი ვენახი', 'ლაბორატორია', 'Bottling', 'Sales'],
      enterprisePrice: 399,
      enterpriseFeatures: ['სრული ციკლი', 'Wine club', 'Export docs', 'Compliance'],
      activeOrganizations: 18,
      totalUsers: 287
    },
    {
      moduleType: 'DISTILLERY',
      name: 'არყის საწარმო',
      nameEn: 'Distillery',
      description: 'არყის წარმოების მართვა',
      descriptionEn: 'Distillery management',
      icon: '🥃',
      color: '#0891b2',
      displayOrder: 7,
      starterPrice: 0,
      starterFeatures: ['წარმოება', 'ინვენტარი', 'შეფუთვა'],
      professionalPrice: 149,
      professionalFeatures: ['დისტილაცია', 'Aging tracking', 'Quality', 'Distribution'],
      enterprisePrice: 399,
      enterpriseFeatures: ['სრული ციკლი', 'Compliance', 'Export', 'Analytics'],
      activeOrganizations: 12,
      totalUsers: 198
    }
  ]

  for (const module of modules) {
    await prisma.$executeRawUnsafe(`
      INSERT INTO "ModuleConfig" (
        id, "moduleType", name, "nameEn", description, "descriptionEn", icon, color, "isEnabled", "displayOrder",
        "starterPrice", "starterDuration", "starterFeatures",
        "professionalPrice", "professionalDuration", "professionalFeatures",
        "enterprisePrice", "enterpriseDuration", "enterpriseFeatures",
        "activeOrganizations", "totalUsers", "createdAt", "updatedAt"
      ) VALUES (
        gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $8, $9,
        $10, $11, $12::text[],
        $13, $14, $15::text[],
        $16, $17, $18::text[],
        $19, $20, NOW(), NOW()
      )
    `,
      module.moduleType,
      module.name,
      module.nameEn,
      module.description,
      module.descriptionEn,
      module.icon,
      module.color,
      module.isEnabled !== false,
      module.displayOrder,
      module.starterPrice,
      module.starterDuration || '15 დღე',
      module.starterFeatures,
      module.professionalPrice,
      module.professionalDuration || 'თვეში',
      module.professionalFeatures,
      module.enterprisePrice,
      module.enterpriseDuration || 'თვეში',
      module.enterpriseFeatures,
      module.activeOrganizations,
      module.totalUsers
    )
  }

  console.log('✅ Created module configurations')

  // Create Landing Page Content
  await prisma.$executeRawUnsafe(`
    INSERT INTO "LandingPageContent" (
      id, key, "heroTitle", "heroSubtitle", "heroDescription",
      "statsBusinesses", "statsTransactions", "statsUsers", "statsUptime", "updatedAt"
    ) VALUES (
      gen_random_uuid()::text, 'main',
      'ბიზნესის მართვის ერთიანი პლატფორმა',
      'აირჩიეთ თქვენი ბიზნესისთვის შესაფერისი მოდული',
      'სრული სპექტრის მართვის სისტემები თქვენი ბიზნესისთვის',
      436, 2500000, 12847, 99.9, NOW()
    )
  `)

  console.log('✅ Created landing page content')

  // Create Sample Organizations
  const organizations = [
    {
      name: 'Hotel Tbilisi',
      slug: 'hotel-tbilisi',
      email: 'info@hotel-tbilisi.ge',
      phone: '+995555123456'
    },
    {
      name: 'Restaurant Plaza',
      slug: 'restaurant-plaza',
      email: 'info@plaza.ge',
      phone: '+995555234567'
    },
    {
      name: 'Beauty House',
      slug: 'beauty-house',
      email: 'info@beauty.ge',
      phone: '+995555345678'
    }
  ]

  for (const org of organizations) {
    const orgId = `org-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const tenantId = `tenant-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    await prisma.$executeRawUnsafe(`
      INSERT INTO "Organization" (id, name, slug, email, phone, "tenantId", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
    `, orgId, org.name, org.slug, org.email, org.phone, tenantId)

    // Create subscription
    await prisma.$executeRawUnsafe(`
      INSERT INTO "Subscription" (
        id, "organizationId", plan, status, price, currency,
        "currentPeriodStart", "currentPeriodEnd", "createdAt", "updatedAt"
      ) VALUES (
        gen_random_uuid()::text, $1, 'PROFESSIONAL', 'ACTIVE', 99, 'GEL',
        NOW(), NOW() + INTERVAL '30 days', NOW(), NOW()
      )
    `, orgId)

    // Add module access
    await prisma.$executeRawUnsafe(`
      INSERT INTO "ModuleAccess" (
        id, "organizationId", "moduleType", "isActive", "maxUsers", "maxRecords", "createdAt", "updatedAt"
      ) VALUES (
        gen_random_uuid()::text, $1, 'HOTEL', true, 50, 100, NOW(), NOW()
      )
    `, orgId)

    // Create sample users
    for (let i = 1; i <= 3; i++) {
      await prisma.$executeRawUnsafe(`
        INSERT INTO "User" (
          id, email, name, password, role, "organizationId", "createdAt", "updatedAt"
        ) VALUES (
          gen_random_uuid()::text, $1, $2, $3, $4, $5, NOW(), NOW()
        )
      `,
        `user${i}@${org.slug}.ge`,
        `User ${i}`,
        hashedPassword,
        i === 1 ? 'ORGANIZATION_OWNER' : 'USER',
        orgId
      )
    }
  }

  console.log('✅ Created sample organizations with users')

  // Create Support Tickets
  const firstOrg = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM "Organization" LIMIT 1
  `
  
  if (firstOrg.length > 0) {
    const orgId = firstOrg[0].id

    await prisma.$executeRawUnsafe(`
      INSERT INTO "SupportTicket" (
        id, "organizationId", subject, description, priority, status, "createdAt", "updatedAt"
      ) VALUES (
        gen_random_uuid()::text, $1, 'Payment issue', 'Cannot process payment with card', 'CRITICAL', 'OPEN', NOW(), NOW()
      )
    `, orgId)

    await prisma.$executeRawUnsafe(`
      INSERT INTO "SupportTicket" (
        id, "organizationId", subject, description, priority, status, "createdAt", "updatedAt"
      ) VALUES (
        gen_random_uuid()::text, $1, 'Feature request', 'Need export to Excel feature', 'LOW', 'IN_PROGRESS', NOW(), NOW()
      )
    `, orgId)

    console.log('✅ Created sample support tickets')

    // Create sample hotel rooms
    const tenantIdResult = await prisma.$queryRawUnsafe<Array<{ tenantId: string }>>(
      `SELECT "tenantId" FROM "Organization" WHERE id = $1`,
      orgId
    )

    if (tenantIdResult.length > 0) {
      const tenantId = tenantIdResult[0].tenantId

      for (let floor = 1; floor <= 3; floor++) {
        for (let room = 1; room <= 5; room++) {
          await prisma.$executeRawUnsafe(`
            INSERT INTO "HotelRoom" (
              id, "tenantId", "roomNumber", "roomType", floor, status, "basePrice", amenities, "maxOccupancy", "createdAt", "updatedAt"
            ) VALUES (
              gen_random_uuid()::text, $1, $2, $3, $4, 'VACANT', $5, $6::text[], $7, NOW(), NOW()
            )
          `,
            tenantId,
            `${floor}0${room}`,
            room <= 3 ? 'STANDARD' : 'DELUXE',
            floor,
            room <= 3 ? 150 : 250,
            ['WiFi', 'TV', 'Mini Bar'],
            room <= 3 ? 2 : 4
          )
        }
      }
      console.log('✅ Created sample hotel rooms')
    }
  }

  console.log('🎉 Database seeded successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

