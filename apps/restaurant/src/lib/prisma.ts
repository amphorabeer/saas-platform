import { PrismaClient } from '../../prisma/generated/client';

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

function createPrismaClient() {
  const url = (process.env.DATABASE_URL || '').replace(/^"|"$/g, '');
  console.log('=== DATABASE_URL ===', url.substring(0, 30));
  return new PrismaClient({
    datasourceUrl: url,
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;