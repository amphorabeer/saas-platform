/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@saas-platform/ui", "@saas-platform/database"],
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Warning: This allows production builds to successfully complete even if
    // your project has TypeScript errors.
    ignoreBuildErrors: true,
  },
  // Mark Prisma as external - don't bundle during build
  serverExternalPackages: ['@prisma/client', 'prisma'],
  // For older Next.js versions:
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'prisma', '@saas-platform/database'],
  },
  // Skip static generation for API routes
  output: 'standalone',
};

module.exports = nextConfig;

