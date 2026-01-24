import { PrismaClient } from '../../prisma/generated/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient(): PrismaClient {
  try {
    return new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    })
  } catch (error) {
    console.error('❌ Failed to create PrismaClient:', error)
    throw error
  }
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export function getPrismaClient(): PrismaClient {
  if (!prisma) {
    throw new Error('PrismaClient not initialized')
  }
  return prisma
}

export default prisma