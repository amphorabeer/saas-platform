import { PrismaClient } from '@prisma/client'

declare global {
  // eslint-disable-next-line no-var
  var prismaClient: PrismaClient | undefined
}

// Create a single instance
let prismaInstance: PrismaClient

if (process.env.NODE_ENV === 'production') {
  prismaInstance = new PrismaClient({
    log: ['error'],
  })
} else {
  // In development, use global to preserve across hot reloads
  if (!global.prismaClient) {
    global.prismaClient = new PrismaClient({
      log: ['error', 'warn'],
    })
  }
  prismaInstance = global.prismaClient
}

export const prisma = prismaInstance

export function getPrismaClient(): PrismaClient {
  // Always return the instance - never undefined
  return prismaInstance
}

export default prisma