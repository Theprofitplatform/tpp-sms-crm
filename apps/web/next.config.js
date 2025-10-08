/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // output: 'export', // Disabled for dynamic routes
  trailingSlash: true,
  env: {
    API_URL: process.env.API_URL || 'http://115.128.86.148:3000',
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://115.128.86.148:3000',
  },
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;
