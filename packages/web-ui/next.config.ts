import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  // Transpile the core package so webpack processes it
  transpilePackages: ['@slorenzot/memento-core'],

  // Prevent webpack from bundling native addons — resolve via Node.js at runtime
  serverExternalPackages: ['better-sqlite3'],

  reactStrictMode: true,

  webpack: (config, { isServer }) => {
    if (isServer) {
      // ── bun:sqlite → better-sqlite3 polyfill ──────────────────────
      //
      // Webpack treats `bun:sqlite` as a builtin external (like `fs`),
      // so resolve.alias is ignored. Use a function-based externals
      // interceptor that redirects bun:sqlite → our better-sqlite3 stub
      // BEFORE webpack's builtin detection.

      const originalExternals = config.externals;

      const stubPath = path.resolve(__dirname, 'src/lib/bun-sqlite-stub.cjs');

      config.externals = [
        function redirectBunSqlite(
          { request }: { request: string },
          callback: (err?: Error | null, result?: string) => void,
        ) {
          if (request === 'bun:sqlite') {
            return callback(null, `commonjs ${stubPath}`);
          }
          return callback();
        },
        ...(Array.isArray(originalExternals) ? originalExternals : [originalExternals]),
      ];

      // Mark optional peer deps as external
      config.externals.push('@huggingface/transformers');
    }
    return config;
  },
};

export default nextConfig;
