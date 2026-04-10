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
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        'puppeteer-core': false,
        '@sparticuz/chromium-min': false,
      }
    }
    return config
  },
}

module.exports = nextConfig












