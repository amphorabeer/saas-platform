import { NextResponse } from 'next/server'
import { prisma, withRetry } from '@saas-platform/database'
import { redis } from '@brewery/redis'
import { metrics } from '@brewery/observability'

export const dynamic = 'force-dynamic'

export async function GET() {
  const checks: Record<string, { status: 'ok' | 'error'; latency?: number; error?: string }> = {}
  
  // Database check with retry logic for Neon cold starts
  const dbStart = Date.now()
  try {
    await withRetry(() => prisma.$queryRaw`SELECT 1`, 3, 1000)
    checks.database = { status: 'ok', latency: Date.now() - dbStart }
  } catch (error) {
    checks.database = { 
      status: 'error', 
      latency: Date.now() - dbStart,
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
  
  // Redis check
  const redisStart = Date.now()
  try {
    // Test Redis connection with a simple get
    await redis.get('health-check')
    checks.redis = { status: 'ok', latency: Date.now() - redisStart }
  } catch (error) {
    checks.redis = { 
      status: 'error', 
      latency: Date.now() - redisStart,
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
  
  // Overall status
  const isHealthy = Object.values(checks).every(c => c.status === 'ok')
  
  return NextResponse.json(
    {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || 'unknown',
      checks,
      metrics: metrics.getAll(),
    },
    { status: isHealthy ? 200 : 503 }
  )
}










