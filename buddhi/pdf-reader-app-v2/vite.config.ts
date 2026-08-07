// vite.config.ts

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  base: '/projects/pdf-reader/',
  server: {
    port: 5173,
    proxy: {
      '/api/rpdf': {
        target: 'http://localhost:7000',
        changeOrigin: true,
      }
    }
  }
})