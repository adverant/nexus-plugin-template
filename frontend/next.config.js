/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export',

  // CUSTOMIZE: Set your plugin's basePath (must match K8s ingress path)
  basePath: '/{{PLUGIN_SLUG}}/ui',

  // Static export doesn't support image optimization
  images: {
    unoptimized: true,
  },

  // Disable SSG bailout for useSearchParams()
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },

  // Environment variables exposed to client
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://api.adverant.ai',
  },
};

module.exports = nextConfig;
