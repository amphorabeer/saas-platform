const path = require('path')

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname, '../../../'),
  transpilePackages: ['@saas-platform/database', '@saas-platform/ui'],
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    outputFileTracingIncludes: {
      '/api/*': [
        './node_modules/.prisma/**/*',
        './node_modules/@prisma/client/**/*',
        '../../../node_modules/.pnpm/@prisma+client@5.22.0*/node_modules/.prisma/**/*',
        '../../../node_modules/.pnpm/@prisma+client@5.22.0*/node_modules/@prisma/client/**/*',
      ],
    },
  },
};

module.exports = nextConfig;
