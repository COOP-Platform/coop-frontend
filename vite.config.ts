import { fileURLToPath, URL } from 'node:url';

import { TanStackRouterVite } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/**
 * Build stamp, injected at build time so a deployed page can say exactly which
 * commit it came from. GitHub Actions sets GITHUB_SHA; Vercel sets
 * VERCEL_GIT_COMMIT_SHA. Neither exists on a local dev run, hence 'local'.
 */
const commitSha = (process.env.GITHUB_SHA ?? process.env.VERCEL_GIT_COMMIT_SHA ?? 'local').slice(
  0,
  7,
);

const builtAt = new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC';

export default defineConfig({
  define: {
    __BUILD_SHA__: JSON.stringify(commitSha),
    __BUILT_AT__: JSON.stringify(builtAt),
  },
  plugins: [
    // Must come before the react plugin: it generates src/routeTree.gen.ts
    // from the files in src/routes/.
    TanStackRouterVite({ autoCodeSplitting: true }),
    react(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    open: true,
  },
});
