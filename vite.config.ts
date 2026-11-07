import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath } from 'node:url'

// The cover engine (pure TypeScript, framework and DOM free) lives in ./engine/src and is imported
// client-side via the @engine alias. There is no backend.
export default defineConfig(({ command, isPreview }) => {
  // GitHub Pages serves this project site under /iridis/. Dev stays at the root; `vite preview`
  // serves the built site, so it needs the same base as the build.
  // Set to '/' if you move to a user site or a custom domain.
  const base = command === 'build' || isPreview ? '/iridis/' : '/'
  return {
    base,
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        includeAssets: ['favicon.svg', 'apple-touch-icon-180x180.png'],
        manifest: {
          name: 'Iridis',
          short_name: 'Iridis',
          description: 'Generate iridescent, grainy book cover backgrounds with flat typography.',
          display: 'standalone',
          theme_color: '#f1f5f9',
          background_color: '#f1f5f9',
          icons: [
            { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
            { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
            { src: 'pwa-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          // Precache everything the app needs offline: the worker chunk, the lazy pdf chunk, the
          // fonts and the icons. Source maps are left out on purpose.
          globPatterns: ['**/*.{js,css,html,svg,png,ttf,webmanifest}'],
          navigateFallback: `${base}index.html`,
          cleanupOutdatedCaches: true,
          maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        },
        devOptions: { enabled: false },
      }),
    ],
    resolve: {
      alias: { '@engine': fileURLToPath(new URL('./engine/src', import.meta.url)) },
    },
    build: { outDir: 'dist', sourcemap: true },
    test: {
      environment: 'node',
      include: ['engine/src/**/*.test.ts', 'src/**/*.test.ts', 'scripts/**/*.test.ts'],
    },
  }
})
