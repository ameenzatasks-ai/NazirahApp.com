import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        name: 'The Hifz App',
        short_name: 'Hifz',
        description: 'Track your daily Sabaq, Sabaq Para & Dawr',
        theme_color: '#0F4C3A',
        background_color: '#FAF7F0',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        // Take over as soon as a new build is fetched. Without these a fresh
        // service worker sits in "waiting" until every tab of the app is
        // closed, so a deploy keeps serving the previous bundle and a plain
        // reload appears to do nothing.
        skipWaiting: true,
        clientsClaim: true,
        // Drop caches from previous builds instead of leaving them to
        // accumulate and potentially be served.
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts-cache', expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: { '@shared': path.resolve(__dirname, '../shared') },
  },
  server: {
    // Listen on all interfaces (0.0.0.0) so phones/tablets on the same
    // Wi-Fi network can reach the dev server via the host machine's LAN IP.
    host: true,
    port: 5173,
    // Proxy /api → the API server. We use 127.0.0.1 (not localhost) because
    // when the dev server is opened from a LAN device, `localhost` would
    // resolve to the *visiting device* — never to the API host. 127.0.0.1
    // here is evaluated by the Vite process itself, which IS the API host.
    proxy: {
      '/api': { target: 'http://127.0.0.1:3001', changeOrigin: true },
    },
  },
});
