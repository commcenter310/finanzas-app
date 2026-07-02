import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
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
        background_color: '#F7F6FB',
        theme_color: '#6A45DD',
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
        // El chunk de xlsx supera el límite default de 2MB sin comprimir
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
      },
    }),
  ],
})
