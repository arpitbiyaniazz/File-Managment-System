import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // ---- API Proxy ----
    // WHY proxy?
    // - Frontend runs on :5173, backend on :80 (Nginx) or :3001-3004
    // - Without proxy, browser blocks cross-origin requests (CORS)
    // - Proxy forwards /api/* to the backend transparently
    // - In production, both are behind the same domain (no proxy needed)
    proxy: {
      '/api': {
        target: 'http://localhost:80', // Nginx API gateway
        changeOrigin: true,
        secure: false,
      },
    },
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});
