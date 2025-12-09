/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@saas-platform/ui", "@saas-platform/database", "@saas-platform/auth"],
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
