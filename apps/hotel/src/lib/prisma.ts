// Try local generated client first, fallback to node_modules
let PrismaClientModule: any;
try {
  // Local generated client (for local development)
  PrismaClientModule = require('../../prisma/generated/client');
} catch {
  // Fallback to node_modules (for Vercel deployment)
  PrismaClientModule = require('@prisma/client');
}

const { PrismaClient } = PrismaClientModule;

const globalForPrisma = globalThis as unknown as {
  prisma: InstanceType<typeof PrismaClient> | undefined
}

function createPrismaClient(): InstanceType<typeof PrismaClient> {
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

export function getPrismaClient(): InstanceType<typeof PrismaClient> {
  if (!prisma) {
    throw new Error('PrismaClient not initialized')
  }
  return prisma
}

export default prisma