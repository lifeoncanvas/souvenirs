import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const API = process.env.VITE_API_TARGET || 'http://localhost:8090';

/**
 * Content-Security-Policy for production builds, injected as a <meta> tag so it works on any static host.
 * Only the third parties the storefront uses are allowed: Google Fonts, Google Analytics (VITE_GA_ID),
 * PayPal checkout, Cloudflare Turnstile, and the API origin (VITE_API_URL). frame-ancestors cannot be
 * set from a meta tag; public/_headers sets it (with HSTS) on hosts that read that file.
 */
function contentSecurityPolicy(env) {
  let api = '';
  try { if (env.VITE_API_URL) api = new URL(env.VITE_API_URL).origin; } catch { /* relative or invalid: same origin */ }
  const paypal = 'https://www.paypal.com https://*.paypal.com https://*.paypalobjects.com';
  const turnstile = 'https://challenges.cloudflare.com';
  const ga = 'https://www.googletagmanager.com';
  const policy = [
    "default-src 'self'",
    `script-src 'self' ${paypal} ${turnstile} ${ga}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https:",
    `connect-src 'self' ${api} ${paypal} https://*.google-analytics.com https://*.analytics.google.com ${ga}`.replace(/\s+/g, ' '),
    `frame-src ${paypal} ${turnstile}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self' https://www.paypal.com",
  ].join('; ');
  return {
    name: 'licht-csp',
    apply: 'build',
    transformIndexHtml: () => [{ tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: policy }, injectTo: 'head-prepend' }],
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  return {
    plugins: [react(), contentSecurityPolicy(env)],
    server: {
      port: 5173,
      proxy: {
        '/api': API,
        '/uploads': API,
        '/sitemap.xml': API,
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: { vendor: ['react', 'react-dom', 'react-router-dom'] },
        },
      },
    },
  };
});
