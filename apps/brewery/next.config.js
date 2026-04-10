/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ['puppeteer-core', '@sparticuz/chromium-min'],
  },
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












