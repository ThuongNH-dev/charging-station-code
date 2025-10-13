import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://localhost:7268', // backend của bạn
        changeOrigin: true,
        secure: false, // backend https dev cert tự ký
      }
    }
  }
})
