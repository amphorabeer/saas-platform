/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  transpilePackages: [
    "@saas-platform/auth",
    "@saas-platform/ui",
    "@saas-platform/utils",
    "@saas-platform/types",
    "@saas-platform/config",
  ],
  images: {
    domains: ['localhost'],
  },
};

module.exports = nextConfig;
