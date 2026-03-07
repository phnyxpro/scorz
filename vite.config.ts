import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.ico', 'logo.svg', 'logo.png'],
      workbox: {
        cleanupOutdatedCaches: true,
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        runtimeCaching: [
          {
            // Cache Supabase REST API calls (scores, contestants, sub_events, etc.)
            urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/(public_contestants|sub_events|competition_levels|competitions|rubric_criteria|performance_slots|judge_scores|contestant_registrations)/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'supabase-api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 30, // 30 minutes
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Cache Supabase RPC calls (vote counts, assigned competitions)
            urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/rpc\/(get_vote_counts|get_assigned_competitions)/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'supabase-rpc-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 15, // 15 minutes
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Cache storage assets (banners, photos)
            urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/v1\/object\/public\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'supabase-storage-cache',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
      manifest: {
        name: 'Scorz',
        short_name: 'Scorz',
        description: 'Live competition management, real-time scoring, and audience engagement — all in one platform.',
        theme_color: '#F59E0B',
        background_color: '#29A38B',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-icon-192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any'
          },
          {
            src: 'pwa-icon-512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any'
          }
        ]
      }
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
