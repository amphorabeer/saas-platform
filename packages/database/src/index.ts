import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
})

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export * from '@prisma/client'

// Export config service (after prisma is defined)
export { getConfig, setConfig, deleteConfig, getAllConfigs } from './config'

// Export helpers
export {
  getModuleConfigs,
  updateModuleConfig,
  getLandingContent,
  updateLandingContent,
  getOrganizations,
  getUserByEmail,
  getActiveSubscriptions,
  getAnalytics
} from './helpers'
