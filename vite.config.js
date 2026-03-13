import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://egregore-production-55f2.up.railway.app',
        changeOrigin: true,
        secure: true,
      },
    },
  },
})
