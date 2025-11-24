import { PrismaClient } from '@prisma/client'

declare global {
  var prisma: PrismaClient | undefined
}

export const prisma = global.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
})

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma
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
