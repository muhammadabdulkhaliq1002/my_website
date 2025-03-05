import { prisma } from './prisma';

export interface DatabaseMetrics {
  connectionLatency: number;
  queryCount: number;
  errorCount: number;
  timestamp: Date;
}

const metrics: DatabaseMetrics[] = [];

export async function checkDatabaseHealth(): Promise<boolean> {
  const startTime = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    const latency = Date.now() - startTime;
    
    metrics.push({
      connectionLatency: latency,
      queryCount: 1,
      errorCount: 0,
      timestamp: new Date()
    });
    
    // Keep only last 100 metrics
    if (metrics.length > 100) {
      metrics.shift();
    }
    
    return true;
  } catch (error) {
    metrics.push({
      connectionLatency: -1,
      queryCount: 0,
      errorCount: 1,
      timestamp: new Date()
    });
    console.error('Database health check failed:', error);
    return false;
  }
}

export function getDatabaseMetrics(): DatabaseMetrics[] {
  return metrics;
}

export function getAverageLatency(): number {
  const validMetrics = metrics.filter(m => m.connectionLatency > 0);
  if (validMetrics.length === 0) return 0;
  
  const total = validMetrics.reduce((sum, metric) => sum + metric.connectionLatency, 0);
  return total / validMetrics.length;
}