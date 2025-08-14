/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {},
  env: {
    NEXT_PUBLIC_TEST_PUSH: process.env.NEXT_PUBLIC_TEST_PUSH || process.env.TEST_MODE_PUSH || '0',
  }
};
module.exports = nextConfig;


