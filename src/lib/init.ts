import { prisma } from './prisma'
import { logger } from './logger'
import { checkDatabaseHealth } from './monitoring'
import { warmupPool } from './warmup'

export async function initializeApp() {
  try {
    // Check database connection
    const isHealthy = await checkDatabaseHealth()
    if (!isHealthy) {
      throw new Error('Database health check failed')
    }
    logger.info('Database connection established')

    // Warm up connection pool in production
    if (process.env.NODE_ENV === 'production') {
      const warmupSuccessful = await warmupPool()
      if (!warmupSuccessful) {
        logger.warn('Connection pool warmup partially failed')
      }
    }

    // Initialize Prisma
    await prisma.$connect()
    logger.info('Prisma connection pool initialized')

    return true
  } catch (error) {
    logger.error('Application initialization failed', { error })
    return false
  }
}