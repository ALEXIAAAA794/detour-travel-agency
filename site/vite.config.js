import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    watch: {
      usePolling: true,
      interval: 500,
    },
    proxy: {
      "/api/support": {
        target: process.env.DETOUR_SUPPORT_API_PROXY || "http://127.0.0.1:3001",
        changeOrigin: true,
      },
      "/client-api": {
        target: process.env.DETOUR_CLIENT_API_PROXY || "http://127.0.0.1:4000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/client-api/, ""),
      },
      "/api": {
        target: process.env.DETOUR_BACKEND_PROXY || "http://127.0.0.1:3000",
        changeOrigin: true,
      },
      "/auth": {
        target: process.env.DETOUR_MANAGER_API_PROXY || "http://127.0.0.1:8081",
        changeOrigin: true,
      },
    },
  },
});
