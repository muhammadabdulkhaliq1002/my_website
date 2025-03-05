import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { checkDatabaseHealth, getDatabaseMetrics, getAverageLatency } from '@/lib/monitoring'

export async function GET() {
  const session = await auth()
  
  // Only allow authenticated admin users to access monitoring
  if (!session?.user || session.user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const isHealthy = await checkDatabaseHealth()
  
  return NextResponse.json({
    status: isHealthy ? 'healthy' : 'unhealthy',
    metrics: getDatabaseMetrics(),
    averageLatency: getAverageLatency(),
    timestamp: new Date().toISOString()
  })
}