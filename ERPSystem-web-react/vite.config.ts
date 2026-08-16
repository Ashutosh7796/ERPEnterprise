import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@core': path.resolve(__dirname, './src/core'),
      '@features': path.resolve(__dirname, './src/features'),
      '@shared': path.resolve(__dirname, './src/shared'),
      '@layouts': path.resolve(__dirname, './src/layouts'),
      '@store': path.resolve(__dirname, './src/store'),
      '@assets': path.resolve(__dirname, './src/assets'),
    },
  },
  server: {
    port: 3001,
    proxy: {
      '/ERPSystem-boot': {
        target: 'http://localhost:9999',
        changeOrigin: true,
        ws: false,
      },
      '/jshERP-boot': {
        target: 'http://localhost:9999',
        changeOrigin: true,
        ws: false,
      },
    },
  },
})
