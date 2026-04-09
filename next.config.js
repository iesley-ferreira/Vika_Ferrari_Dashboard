const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // ESLint plugin dependency conflict in CI — linting handled localmente
    ignoreDuringBuilds: true,
  },
  // Prevent Next.js barrel optimizer from processing recharts (causes lodash _arrayEvery error)
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  webpack: (config) => {
    // Force recharts to use its CJS build instead of ES6 (avoids lodash internal module errors)
    config.resolve.alias = {
      ...config.resolve.alias,
      recharts: path.resolve('./node_modules/recharts/cjs/index.js'),
    };
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ajwowcerbjquqaveqtlr.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

module.exports = nextConfig;
