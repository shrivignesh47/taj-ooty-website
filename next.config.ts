import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: process.env.TAURI_BUILD === '1' ? 'export' : undefined,
  trailingSlash: true,
  images: {
    unoptimized: process.env.TAURI_BUILD === '1',
  },
  // Allow cross-origin requests from local network devices
  // (phones/tablets scanning QR codes on the same WiFi)
  allowedDevOrigins: ['192.168.29.46'],
};

export default nextConfig;
