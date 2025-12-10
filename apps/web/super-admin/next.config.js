const path = require('path')

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@saas-platform/ui", "@saas-platform/database", "@saas-platform/auth"],
  // IMPORTANT: This tells Vercel to include files from monorepo root
  outputFileTracingRoot: path.join(__dirname, '../../../'),
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client", "prisma"],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push("@prisma/client");
    }
    return config;
  },
};

module.exports = nextConfig;
