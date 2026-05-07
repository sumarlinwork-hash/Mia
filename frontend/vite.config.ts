import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/ws': {
        target: 'http://127.0.0.1:8000',
        ws: true,
      },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'MIA | AI Agent',
        short_name: 'MIA',
        description: 'Autonomous AI Personal Assistant',
        theme_color: '#000000',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: [
            'react',
            'react-dom',
            '@tanstack/react-query',
            'react-router-dom'
          ],
          studio: [
            '@monaco-editor/react',
            'reactflow'
          ],
          markdown: [
            'react-markdown',
            'remark-gfm',
            'react-syntax-highlighter'
          ],
        },
      },
    },
    chunkSizeWarningLimit: 500,
  },
})
