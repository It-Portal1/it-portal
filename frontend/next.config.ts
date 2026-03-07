import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // API-Requests an das Backend weiterleiten (Development)
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:5000/api/:path*',
      },
      {
        source: '/hosted/:path*',
        destination: 'http://localhost:5000/hosted/:path*',
      },
    ];
  },
  // Sicherheits-Header
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
  // Hide the Next.js development indicator "n" icon
  // @ts-ignore - Next.js 15+ allows false to hide the Dev Tools overlay
  devIndicators: false,
};

export default nextConfig;
