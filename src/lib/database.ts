import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';
import { LRUCache } from 'lru-cache';

// Singleton instance for Prisma Client
let prisma: PrismaClient;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient().$extends(withAccelerate());
} else {
  if (!(global as any).prisma) {
    (global as any).prisma = new PrismaClient();
  }
  prisma = (global as any).prisma;
}

// Cache configuration
const CACHE_TTL = 60 * 5; // 5 minutes
const cache = new Map();

export async function query<T>(
  key: string,
  queryFn: () => Promise<T>,
  ttl: number = CACHE_TTL
): Promise<T> {
  const cached = cache.get(key);
  if (cached && cached.expiry > Date.now()) {
    return cached.data as T;
  }

  const data = await queryFn();
  cache.set(key, {
    data,
    expiry: Date.now() + ttl * 1000
  });

  return data;
}

// Automatic cache cleanup
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of cache.entries()) {
    if (value.expiry <= now) {
      cache.delete(key);
    }
  }
}, 60000); // Clean up every minute

const queryCache = new LRUCache({
  max: 500,
  ttl: 1000 * 60 * 5, // 5 minutes
});

export async function cachedQuery<T>(
  key: string,
  query: () => Promise<T>,
  ttl?: number
): Promise<T> {
  const cached = queryCache.get(key);
  if (cached) {
    return cached as T;
  }

  const result = await query();
  queryCache.set(key, result, { ttl });
  return result;
}

export function invalidateCache(keyPattern: string) {
  for (const key of queryCache.keys()) {
    if (key.includes(keyPattern)) {
      queryCache.delete(key);
    }
  }
}

// Database transaction helper with retries
export async function withTransaction<T>(
  fn: (tx: typeof prisma) => Promise<T>,
  maxRetries = 3
): Promise<T> {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await prisma.$transaction(async (tx) => {
        return await fn(tx);
      });
    } catch (error: any) {
      attempt++;
      if (attempt === maxRetries || !isRetryableError(error)) {
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, 2 ** attempt * 100));
    }
  }
  throw new Error('Transaction failed after max retries');
}

function isRetryableError(error: any): boolean {
  const retryableCodes = ['40001', '40P01'];
  return retryableCodes.includes(error.code);
}

export { prisma };