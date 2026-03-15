import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5000,
    proxy: {
      // 只代理真正的 API 请求，避免 /api-xxx 被误代理
      '/api/v1': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/api/v2': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/api/interfaces': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/api/auth': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/api/users': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/api/projects': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/api/test-suites': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/api/environments': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/api/chat': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/api/knowledge': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      }
    }
  }
})
