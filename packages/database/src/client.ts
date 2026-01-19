import { PrismaClient, Prisma } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' 
    ? ['error', 'warn'] 
    : ['error'],
})

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export function withTenant<T extends Record<string, unknown>>(
  tenantId: string,
  where: T
): T & { tenantId: string } {
  return { ...where, tenantId }
}

export async function withTransaction<T>(
  fn: (tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]) => Promise<T>,
  options?: { timeout?: number; isolationLevel?: 'ReadCommitted' | 'Serializable' }
): Promise<T> {
  return prisma.$transaction(fn, {
    timeout: options?.timeout ?? 10000,
    isolationLevel: options?.isolationLevel ?? 'ReadCommitted',
  })
}

export type PrismaTransactionClient = Prisma.TransactionClient

export async function withRetry<T>(
  operation: () => Promise<T>,
  retries = 3,
  delay = 1000
): Promise<T> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await operation()
    } catch (error: any) {
      const isConnectionError = 
        error.code === 'P1001' ||
        error.code === 'P1002' ||
        error.message?.includes("Can't reach database") ||
        error.message?.includes('connection') ||
        error.message?.includes('timeout')
      
      if (isConnectionError && attempt < retries) {
        console.warn(`[DB] Connection attempt ${attempt} failed, retrying in ${delay}ms...`, error.message)
        await new Promise(resolve => setTimeout(resolve, delay))
        delay *= 2
        continue
      }
      throw error
    }
  }
  throw new Error('All retry attempts failed')
}
