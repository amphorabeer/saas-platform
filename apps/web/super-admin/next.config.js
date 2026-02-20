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
  },
};

module.exports = nextConfig;
