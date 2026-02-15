const path = require('path')

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  transpilePackages: ['@saas-platform/database', '@saas-platform/ui'],
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    instrumentationHook: true,
    outputFileTracingIncludes: {
      '/api/**/*': ['./node_modules/.prisma/**/*', './prisma/generated/**/*'],
    },
  },
  async headers() {
    return [{
        source: "/api/:path*",
        headers: [
        { key: "Access-Control-Allow-Origin", value: "*" },
        { key: "Access-Control-Allow-Methods", value: "GET,POST,PUT,DELETE,OPTIONS" },
        { key: "Access-Control-Allow-Headers", value: "Content-Type,Authorization" },
        ],
    }];
  },
};

module.exports = nextConfig;

// cache bust 1771188690
// 1771189244
