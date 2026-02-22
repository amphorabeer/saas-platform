const path = require('path')

/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: 'standalone',
  transpilePackages: ['@saas-platform/database', '@saas-platform/ui'],
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    instrumentationHook: true,
    outputFileTracingExcludes: {
      '**/*': [
        'node_modules/.pnpm/@prisma+client*/node_modules/.prisma/**',
        'node_modules/.pnpm/@swc+core*/**',
        'node_modules/.pnpm/esbuild-*/**',
      ],
    },
  },
};

module.exports = nextConfig;
