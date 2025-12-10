import { PrismaClient } from '@prisma/client'

// Global prisma instance for development
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Lazy initialization - only create when actually used
function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })
}

// Export a getter function instead of direct instance
export function getPrisma(): PrismaClient {
  if (typeof window !== 'undefined') {
    throw new Error('PrismaClient cannot be used in the browser')
  }
  
  if (process.env.NODE_ENV === 'production') {
    return createPrismaClient()
  }
  
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient()
  }
  
  return globalForPrisma.prisma
}

// For backward compatibility - use getter
export const prisma = new Proxy({} as PrismaClient, {
  get(target, prop) {
    const client = getPrisma()
    return (client as any)[prop]
  }
})

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
