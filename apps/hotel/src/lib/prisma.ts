const globalForPrisma = globalThis as unknown as {
  prisma: any | undefined
}

export function getPrismaClient() {
  if (!globalForPrisma.prisma) {
    // Use require() instead of import to prevent bundle-time evaluation
    const { PrismaClient } = require('@prisma/client')
    const { withAccelerate } = require('@prisma/extension-accelerate')
    globalForPrisma.prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    }).$extends(withAccelerate())
  }
  return globalForPrisma.prisma
}

// For backward compatibility - DO NOT USE in imports
// export const prisma = getPrismaClient()  // ❌ არ გამოიყენო

