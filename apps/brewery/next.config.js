/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    "@saas-platform/ui",
    "@saas-platform/database",
    "@saas-platform/types",
    "@saas-platform/utils"
  ],
  images: {
    domains: ['localhost'],
  },
}

module.exports = nextConfig












