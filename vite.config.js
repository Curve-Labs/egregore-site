import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // SPA fallback — send all routes to index.html
    historyApiFallback: true,
  },
})
