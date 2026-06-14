import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['now.svg', 'icons/apple-touch-icon.png'],
      workbox: {
        // mapbox-gl is a large but cacheable vendor chunk.
        maximumFileSizeToCacheInBytes: 3_000_000,
        // Never serve the SPA shell for API routes — the service worker's
        // navigation fallback must not intercept /api/* (it would return
        // index.html in the browser instead of the JSON from the function).
        navigateFallbackDenylist: [/^\/api\//],
      },
      manifest: {
        name: 'NOW — Barcelona',
        short_name: 'NOW',
        description: 'The city is alive. Real-time activity map for Barcelona.',
        theme_color: '#0c0a09',
        background_color: '#0c0a09',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Split the heavy map vendor out of the app chunk for better caching.
        manualChunks: {
          mapbox: ['mapbox-gl'],
        },
      },
    },
  },
});
