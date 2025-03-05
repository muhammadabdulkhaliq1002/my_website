import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Cache for rate limiting
const rateLimit = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS = 60; // requests per minute

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW;
  
  // Clean up old entries
  for (const [key, timestamp] of rateLimit.entries()) {
    if (timestamp < windowStart) rateLimit.delete(key);
  }
  
  const requestCount = Array.from(rateLimit.entries())
    .filter(([key, timestamp]) => key.startsWith(ip) && timestamp > windowStart)
    .length;

  if (requestCount >= MAX_REQUESTS) return true;
  
  rateLimit.set(`${ip}-${now}`, now);
  return false;
}

// Cache-Control header configurations
const cacheConfig = {
  public: 'public, max-age=3600, s-maxage=60, stale-while-revalidate=300',
  private: 'private, no-cache, no-store, must-revalidate',
  api: 'public, max-age=60, s-maxage=30, stale-while-revalidate=86400'
};

export default withAuth(
  function middleware(req: NextRequest) {
    const ip = req.ip || req.headers.get('x-forwarded-for') || 'unknown';
    
    // Apply rate limiting except for static assets
    if (!req.nextUrl.pathname.startsWith('/_next/') && isRateLimited(ip)) {
      return new NextResponse('Too Many Requests', { status: 429 });
    }

    // Allow registration endpoint without authentication
    if (req.nextUrl.pathname === '/api/register') {
      return NextResponse.next();
    }

    const response = NextResponse.next();

    // Add security headers
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');

    // Set appropriate caching headers based on route type
    if (req.nextUrl.pathname.startsWith('/api/')) {
      response.headers.set('Cache-Control', cacheConfig.api);
    } else if (req.nextUrl.pathname.startsWith('/dashboard/')) {
      response.headers.set('Cache-Control', cacheConfig.private);
    } else {
      response.headers.set('Cache-Control', cacheConfig.public);
    }

    // Enable HTTP/2 Server Push for critical assets
    if (req.nextUrl.pathname === '/') {
      response.headers.set('Link', '</fonts/brand-regular.woff2>; rel=preload; as=font; crossorigin=anonymous');
    }

    return response;
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        if (req.nextUrl.pathname === '/api/register') {
          return true;
        }
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    '/api/:path*',
    '/dashboard/:path*',
  ]
}