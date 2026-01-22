const globalForPrisma = globalThis as unknown as {
  prisma: any | undefined
}

export function getPrismaClient() {
  if (!globalForPrisma.prisma) {
    const { PrismaClient } = require('@prisma/client')
    globalForPrisma.prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    })
  }
  return globalForPrisma.prisma
}

