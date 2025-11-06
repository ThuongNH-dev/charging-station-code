// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://localhost:7268', // đúng URL backend (swagger của bạn đang ở đây)
        changeOrigin: true,
        secure: false,
        // Nếu backend KHÔNG có prefix /api thì bật dòng dưới:
        // rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
})
