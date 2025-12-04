/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@saas-platform/ui", "@saas-platform/database"],
};

module.exports = nextConfig;

