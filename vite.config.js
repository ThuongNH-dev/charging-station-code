// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Mọi request bắt đầu bằng /api sẽ được proxy sang BE
      "/api": {
        target: "https://localhost:7268", // URL BE của bạn
        changeOrigin: true,               // sửa Origin cho hợp lệ
        secure: false,                    // BE dùng HTTPS self-signed → cần false
        // nếu BE KHÔNG có tiền tố /api, bỏ ghi chú dòng rewrite:
        // rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
