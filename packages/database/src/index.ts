// Import and re-export from client.ts which has proper initialization
import { prisma, withTenant, withTransaction, withRetry } from './client'
export { prisma, withTenant, withTransaction, withRetry }
export type { PrismaTransactionClient } from './client'

// For backward compatibility
export function getPrisma() {
  return prisma
}

// Export only types, not values (prevents build-time evaluation)
export type { Prisma, PrismaClient } from '@prisma/client'

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
