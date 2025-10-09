import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',  // Cho phép truy cập từ thiết bị khác
    port: 5173,        // Giữ nguyên port mặc định
  },
});
