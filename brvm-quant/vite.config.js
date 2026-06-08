import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite' // <-- Ajoutez cette ligne

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), // <-- Ajoutez cette ligne
  ],
})