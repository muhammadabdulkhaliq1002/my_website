import { prisma } from './prisma'
import { logger } from './logger'

async function warmupConnection() {
  try {
    // Execute a simple query to warm up the connection
    await prisma.$queryRaw`SELECT 1`
    logger.info('Database connection warmed up')
    return true
  } catch (error) {
    logger.error('Warmup failed', { error })
    return false
  }
}

export async function warmupPool() {
  const poolSize = process.env.POSTGRES_POOL_MIN ? 
    parseInt(process.env.POSTGRES_POOL_MIN) : 5
  
  const warmupPromises = Array(poolSize)
    .fill(null)
    .map(() => warmupConnection())
  
  const results = await Promise.allSettled(warmupPromises)
  const successCount = results.filter(r => r.status === 'fulfilled' && r.value).length
  
  logger.info('Connection pool warmup completed', {
    attempted: poolSize,
    successful: successCount
  })
  
  return successCount === poolSize
}