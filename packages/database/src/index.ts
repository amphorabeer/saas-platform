import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Check if we're in build phase
const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build'

function createPrismaClient(): PrismaClient {
  // During build, return a mock that doesn't connect
  if (isBuildPhase) {
    console.log('[Prisma] Build phase detected, skipping initialization')
    return new Proxy({} as PrismaClient, {
      get() {
        return () => Promise.resolve(null)
      }
    })
  }
  
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })
}

export function getPrisma(): PrismaClient {
  if (typeof window !== 'undefined') {
    throw new Error('PrismaClient cannot be used in the browser')
  }
  
  if (isBuildPhase) {
    return createPrismaClient()
  }
  
  if (process.env.NODE_ENV === 'production') {
    return createPrismaClient()
  }
  
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient()
  }
  
  return globalForPrisma.prisma
}

// For backward compatibility
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
