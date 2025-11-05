/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@poim/shared'],
  webpack: (config) => {
    config.externals.push('pino-pretty', 'lokijs', 'encoding');
    return config;
  },
  // Add headers to prevent encoding issues
  async headers() {
    return [
      {
        source: '/api/x402/:path*',
        headers: [
          {
            key: 'Content-Encoding',
            value: 'identity',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
