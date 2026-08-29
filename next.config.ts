import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow cross-origin requests from local network devices
  // (phones/tablets scanning QR codes on the same WiFi)
  allowedDevOrigins: ['192.168.29.46'],
  headers: async () => [
    {
      source: '/staff/:path*',
      headers: [
        // Never cache auth-protected pages — a cached 307 redirect here would
        // create a login redirect loop on Vercel's edge cache.
        { key: 'Cache-Control', value: 'no-store' },
      ],
    },
  ],
};

export default nextConfig;
