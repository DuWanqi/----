import { defineConfig } from 'vite'

export default defineConfig({
  base: '/dev/3d_game_template/',
  server: {
    host: true,
    port: 5178,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})
