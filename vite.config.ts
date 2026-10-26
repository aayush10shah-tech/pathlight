import { defineConfig } from 'vitest/config';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { CSP } from './src/policy';

// The production build ships a Content-Security-Policy (see src/policy.ts) so the browser itself
// guarantees report text never leaves the device. Dev mode needs inline scripts and a websocket
// for hot reload, so the policy is added at build time only.
const csp = (): Plugin => ({
  name: 'pathlight-csp',
  apply: 'build',
  transformIndexHtml: (html) =>
    html.replace('<meta charset="UTF-8" />', `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />\n    <meta name="referrer" content="no-referrer" />`),
});

// `base` is './' so the build works from any GitHub Pages sub-path.
export default defineConfig({
  base: './',
  plugins: [react(), csp()],
  build: { target: 'es2022', sourcemap: true },
  test: { include: ['tests/**/*.test.ts'] },
});
