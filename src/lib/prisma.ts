import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

import { PrismaClient } from '.prisma/client'
import { logger } from './logger'
import { connectionManager } from './connectionManager'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: [
    {
      emit: 'event',
      level: 'query',
    },
    {
      emit: 'event',
      level: 'error',
    },
    {
      emit: 'event',
      level: 'warn',
    },
  ],
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  },
  // Add connection timeout and retry configuration
  __internal: {
    engine: {
      connectionTimeout: 5000,
      pollInterval: 100,
      retry: {
        maxRetries: 3,
        minTimeout: 1000,
        maxTimeout: 5000
      }
    }
  }
})

// Wrap Prisma operations with circuit breaker
const wrappedPrisma = new Proxy(prisma, {
  get(target, prop) {
    const original = target[prop as keyof typeof target]
    if (typeof original === 'function') {
      return async (...args: any[]) => {
        return connectionManager.executeQuery(() => original.apply(target, args))
      }
    }
    return original
  }
})

// Query timing middleware
prisma.$on('query', (e: any) => {
  if (e.duration >= 100) { // Log slow queries (>100ms)
    logger.warn('Slow query detected', {
      query: e.query,
      duration: e.duration,
      timestamp: new Date().toISOString()
    })
  }
})

prisma.$on('error', (e: any) => {
  logger.error('Prisma error', {
    error: e.error,
    timestamp: new Date().toISOString()
  })
})

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = wrappedPrisma as typeof prisma
}

export { wrappedPrisma as prisma }
