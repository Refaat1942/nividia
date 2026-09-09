/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  async rewrites() {
    const apiUrl = process.env.INTERNAL_API_URL || 'http://backend:8000';
    return [
      { source: '/api/:path*', destination: `${apiUrl}/api/:path*` },
      { source: '/health', destination: `${apiUrl}/health` },
    ];
  },
};

module.exports = nextConfig;
