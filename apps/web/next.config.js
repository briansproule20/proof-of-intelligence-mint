/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@poim/shared'],
  experimental: {
    nodeMiddleware: true, // Required for @coinbase/x402 facilitator (temporary until Edge runtime support)
  },
  webpack: (config) => {
    config.externals.push('pino-pretty', 'lokijs', 'encoding');
    return config;
  },
};

module.exports = nextConfig;
