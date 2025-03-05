const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'Referrer-Policy',
    value: 'origin-when-cross-origin'
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()'
  }
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
  images: {
    domains: ['lh3.googleusercontent.com'], // For Google profile images
    deviceSizes: [640, 768, 1024, 1280, 1536], // Optimized breakpoints
    imageSizes: [16, 32, 48, 64, 96, 128],     // Reduced sizes for better caching
    formats: ['image/webp', 'image/avif'],      // Added AVIF support for better compression
    minimumCacheTTL: 60,                        // Add caching
  },
  poweredByHeader: false,
  compress: true,
  i18n: {
    locales: ['en'],
    defaultLocale: 'en',
  },
};

if (process.env.NODE_ENV === 'production') {
  // In production, wrap the Next.js config with PWA configuration using the newer package
  const withPWA = require('@ducanh2912/next-pwa').default;
  module.exports = withPWA({
    dest: 'public',
    register: true,
    skipWaiting: true,
    disable: process.env.NODE_ENV === 'development',
    cacheOnFrontEndNav: true,
    aggressiveFrontEndNavCaching: true,
  })(nextConfig);
} else {
  // In development, export the config directly
  module.exports = nextConfig;
}
