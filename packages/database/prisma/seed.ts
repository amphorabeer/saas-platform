import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { config } from 'dotenv'
import { resolve } from 'path'

// Load .env file
config({ path: resolve(__dirname, '../.env') })

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create Super Admin
  const hashedPassword = await bcrypt.hash('admin123', 10)
  
  const superAdmin = await prisma.user.create({
    data: {
      email: 'admin@platform.ge',
      name: 'Super Admin',
      password: hashedPassword,
      role: 'SUPER_ADMIN',
      emailVerified: new Date(),
    }
  })

  console.log('✅ Created super admin:', superAdmin.email)

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
    await prisma.moduleConfig.create({
      data: module
    })
  }

  console.log('✅ Created module configurations')

  // Create Landing Page Content
  await prisma.landingPageContent.create({
    data: {
      key: 'main',
      heroTitle: 'ბიზნესის მართვის ერთიანი პლატფორმა',
      heroSubtitle: 'აირჩიეთ თქვენი ბიზნესისთვის შესაფერისი მოდული',
      heroDescription: 'სრული სპექტრის მართვის სისტემები თქვენი ბიზნესისთვის',
      statsBusinesses: 436,
      statsTransactions: 2500000,
      statsUsers: 12847,
      statsUptime: 99.9
    }
  })

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
    const organization = await prisma.organization.create({
      data: org
    })

    // Create subscription
    await prisma.subscription.create({
      data: {
        organizationId: organization.id,
        plan: 'PROFESSIONAL',
        status: 'ACTIVE',
        price: 99,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      }
    })

    // Add module access
    await prisma.moduleAccess.create({
      data: {
        organizationId: organization.id,
        moduleType: 'HOTEL',
        isActive: true,
        maxUsers: 50,
        maxRecords: 100
      }
    })

    // Create sample users
    for (let i = 1; i <= 3; i++) {
      await prisma.user.create({
        data: {
          email: `user${i}@${org.slug}.ge`,
          name: `User ${i}`,
          password: hashedPassword,
          role: i === 1 ? 'ORGANIZATION_OWNER' : 'USER',
          organizationId: organization.id,
        }
      })
    }
  }

  console.log('✅ Created sample organizations with users')

  // Create Support Tickets
  const tickets = [
    {
      subject: 'Payment issue',
      description: 'Cannot process payment with card',
      priority: 'CRITICAL',
      status: 'OPEN'
    },
    {
      subject: 'Feature request',
      description: 'Need export to Excel feature',
      priority: 'LOW',
      status: 'IN_PROGRESS'
    }
  ]

  const firstOrg = await prisma.organization.findFirst()
  
  for (const ticket of tickets) {
    await prisma.supportTicket.create({
      data: {
        ...ticket,
        organizationId: firstOrg!.id
      }
    })
  }

  console.log('✅ Created sample support tickets')

  // Create sample hotel rooms for first organization
  if (firstOrg) {
    for (let floor = 1; floor <= 3; floor++) {
      for (let room = 1; room <= 5; room++) {
        await prisma.hotelRoom.create({
          data: {
            tenantId: firstOrg.tenantId,
            roomNumber: `${floor}0${room}`,
            roomType: room <= 3 ? 'STANDARD' : 'DELUXE',
            floor: floor,
            status: 'VACANT',
            basePrice: room <= 3 ? 150 : 250,
            amenities: ['WiFi', 'TV', 'Mini Bar'],
            maxOccupancy: room <= 3 ? 2 : 4
          }
        })
      }
    }
    console.log('✅ Created sample hotel rooms')
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
