import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Transpile the core package (CJS) for compatibility
  transpilePackages: ['@slorenzot/memento-core'],

  // Exclude bun:sqlite native bindings from webpack bundling
  serverExternalPackages: ['bun:sqlite'],

  // App directory is the default in Next.js 15
  reactStrictMode: true,
};

export default nextConfig;
