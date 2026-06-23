import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/FitnessApp/',   // Change this to your GitHub repo name when deploying
})
