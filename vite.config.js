import { defineConfig } from 'vite'
import basicSsl from '@vitejs/plugin-basic-ssl'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react(), basicSsl()],  // FIX: pakai koma, bukan ][
  server: {
    https: true,
    host: true
  }
})