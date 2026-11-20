import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Erlaubt den Zugriff über die weitergeleitete Codespaces-Adresse.
    allowedHosts: ['.app.github.dev'],
    // Leitet /api an die lokale API weiter (genutzt, wenn VITE_API_BASE_URL=/api).
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
})
