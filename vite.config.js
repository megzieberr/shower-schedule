import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base: './' makes every asset path relative, so the app works no matter
// what sub-folder GitHub Pages serves it from (e.g. /shower-schedule/).
export default defineConfig({
  base: './',
  plugins: [react()],
})
