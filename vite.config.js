import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  server: {
    host: 'localhost',
    port: 5173,
    strictPort: false,
    proxy: {
      '/api': {
        target: 'http://localhost',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/H-A-Cozy-Pad/api'),
      },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
  ],
})