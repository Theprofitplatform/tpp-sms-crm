/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // output: 'export', // Disabled for dynamic routes
  trailingSlash: true,
  env: {
    API_URL: process.env.API_URL || 'https://apisms.theprofitplatform.com.au',
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://apisms.theprofitplatform.com.au',
  },
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;
