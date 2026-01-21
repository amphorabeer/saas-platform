/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@saas-platform/ui'],
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    missingSuspenseWithCSRBailout: false,
    outputFileTracingIncludes: {
      '/api/**/*': ['./node_modules/.prisma/**/*'],
    },
  },
}

module.exports = nextConfig
