import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (err) => {
            if ((err as NodeJS.ErrnoException).code === 'EPIPE' ||
                (err as NodeJS.ErrnoException).code === 'ECONNRESET') return;
            console.error('proxy error', err);
          });
        }
      },
      '/uploads': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (err) => {
            if ((err as NodeJS.ErrnoException).code === 'EPIPE' ||
                (err as NodeJS.ErrnoException).code === 'ECONNRESET') return;
            console.error('proxy error', err);
          });
        }
      },
      '/socket.io': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        ws: true,
        configure: (proxy) => {
          proxy.on('error', (err) => {
            if ((err as NodeJS.ErrnoException).code === 'EPIPE' ||
                (err as NodeJS.ErrnoException).code === 'ECONNRESET') return;
            console.error('proxy error', err);
          });
        }
      }
    }
  }
});
