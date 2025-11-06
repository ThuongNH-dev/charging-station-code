import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "https://localhost:7268", // ⚡ BE của bạn
        changeOrigin: true,
        secure: false,                     // ⚡ chấp nhận cert tự ký
        // rewrite: (p) => p,              // giữ nguyên /api (không cần đổi)
      },
    },
  },
});
