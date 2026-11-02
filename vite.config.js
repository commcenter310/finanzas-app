import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        // Paquetes de vendors separados para cachearlos entre deploys.
        // React va con prioridad más alta: si no, al recolectar las
        // dependencias de recharts su envoltorio CJS (require_react) acababa
        // en el chunk de gráficas y TODA la app precargaba sus 400 KB.
        codeSplitting: {
          groups: [
            { name: 'react', test: /node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/, priority: 40 },
            { name: 'supabase', test: /node_modules[\\/]@supabase[\\/]/, priority: 30 },
            { name: 'icons', test: /node_modules[\\/]lucide-react[\\/]/, priority: 30 },
            { name: 'charts', test: /node_modules[\\/](recharts|d3-[^\\/]+|victory-vendor)[\\/]/, priority: 20 },
          ],
        },
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Finni Apoyo — Control Personal',
        short_name: 'Finni',
        description: 'Control de finanzas personales: gastos, ingresos, presupuestos, deudas y proyecciones.',
        lang: 'es-MX',
        start_url: '/',
        display: 'standalone',
        background_color: '#F6F4F1',
        theme_color: '#23221F',
        icons: [
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Precachea el shell de la app (JS/CSS/HTML) para abrir al instante.
        // Los datos siguen viniendo de Supabase por red (nunca se cachean aquí).
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: '/index.html',
        // El webhook del bot vive en /api — jamás debe servirlo el service worker
        navigateFallbackDenylist: [/^\/api\//],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        // Cuando hay deploy nuevo, el SW nuevo toma control de inmediato y
        // borra los caches viejos → evita servir un index.html que apunta a
        // chunks que ya no existen (la causa de "Failed to fetch module").
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
      },
    }),
  ],
})
