import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  // Transpile the core package so webpack processes it
  transpilePackages: ['@slorenzot/memento-core'],

  reactStrictMode: true,

  webpack: (config, { isServer }) => {
    if (isServer) {
      // ── bun:sqlite → better-sqlite3 polyfill ──────────────────────
      //
      // Problem: Webpack treats `bun:sqlite` as a builtin external (like `fs`),
      // so resolve.alias and NormalModuleReplacementPlugin are ignored.
      //
      // Solution: Use a function-based externals interceptor that redirects
      // `bun:sqlite` → `better-sqlite3` BEFORE webpack's builtin detection.
      //
      // The `commonjs better-sqlite3` result tells webpack to emit
      // `require("better-sqlite3")` instead of `require("bun:sqlite")`.

      const originalExternals = config.externals;

      // Path to our bun:sqlite → better-sqlite3 polyfill wrapper
      const stubPath = path.resolve(__dirname, 'src/lib/bun-sqlite-stub.cjs');

      config.externals = [
        function redirectBunSqlite(
          { request }: { request: string },
          callback: (err?: Error | null, result?: string) => void,
        ) {
          if (request === 'bun:sqlite') {
            // Redirect to our wrapper that normalizes better-sqlite3 exports
            return callback(null, `commonjs ${stubPath}`);
          }
          return callback();
        },
        ...(Array.isArray(originalExternals) ? originalExternals : [originalExternals]),
      ];

      // Mark @huggingface/transformers as external (optional peer dep)
      config.externals.push('@huggingface/transformers');
    }
    return config;
  },
};

export default nextConfig;
