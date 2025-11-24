import { prisma } from './index'

// Module helpers
export async function getModuleConfigs(enabled = true) {
  return prisma.moduleConfig.findMany({
    where: enabled ? { isEnabled: true } : undefined,
    orderBy: { displayOrder: 'asc' }
  })
}

export async function updateModuleConfig(moduleType: string, data: any) {
  return prisma.moduleConfig.update({
    where: { moduleType: moduleType as any },
    data
  })
}

// Landing page helpers
export async function getLandingContent() {
  return prisma.landingPageContent.findUnique({
    where: { key: 'main' }
  })
}

export async function updateLandingContent(data: any) {
  return prisma.landingPageContent.upsert({
    where: { key: 'main' },
    update: data,
    create: { key: 'main', ...data }
  })
}

// Organization helpers
export async function getOrganizations(skip = 0, take = 10) {
  const [organizations, total] = await Promise.all([
    prisma.organization.findMany({
      skip,
      take,
      include: {
        subscription: true,
        modules: true,
        _count: {
          select: { users: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.organization.count()
  ])
  
  return { organizations, total }
}

// User helpers
export async function getUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
    include: { organization: true }
  })
}

// Subscription helpers
export async function getActiveSubscriptions() {
  return prisma.subscription.findMany({
    where: { status: 'ACTIVE' },
    include: { organization: true }
  })
}

// Analytics helpers
export async function getAnalytics() {
  const [totalOrgs, totalUsers, activeSubscriptions, revenue] = await Promise.all([
    prisma.organization.count(),
    prisma.user.count(),
    prisma.subscription.count({ where: { status: 'ACTIVE' } }),
    prisma.subscription.aggregate({
      where: { status: 'ACTIVE' },
      _sum: { price: true }
    })
  ])
  
  return {
    totalOrganizations: totalOrgs,
    totalUsers,
    activeSubscriptions,
    monthlyRevenue: revenue._sum.price || 0
  }
}

