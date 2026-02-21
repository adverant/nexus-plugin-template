/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',

  // Disable static generation for fully dynamic SPA
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },

  // Environment variables exposed to the browser
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080',
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080/ws',
    NEXT_PUBLIC_PLUGIN_NAME: process.env.NEXT_PUBLIC_PLUGIN_NAME || '{{PLUGIN_NAME}}',
  },

  // Disable image optimization for standalone mode
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;
