export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Ensure Prisma engine is available
    await import('./src/lib/prisma')
  }
}

