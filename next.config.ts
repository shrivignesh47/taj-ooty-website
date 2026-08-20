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
  webpack: (config) => {
    if (process.env.TAURI_BUILD === '1') {
      const path = require('path');
      const actions = [
        'adminActions', 'auth', 'billingActions', 'couponActions', 'dashboardPrefActions',
        'fetchAdminStats', 'getOrderStatus', 'loyaltyActions', 'notificationActions',
        'staffActions', 'submitOrder', 'updateOrderStatus', 'waiterActions'
      ];
      actions.forEach(action => {
        const targetPath = path.resolve(__dirname, `src/features/ordering/actions/${action}`);
        const mockPath = path.resolve(__dirname, 'src/features/ordering/actions/mockActions.ts');
        config.resolve.alias[targetPath] = mockPath;
        config.resolve.alias[`${targetPath}.ts`] = mockPath;
        config.resolve.alias[`@/features/ordering/actions/${action}`] = mockPath;
      });
    }
    return config;
  },
  experimental: {
    turbopack: {},
  },
};

export default nextConfig;
