import { defineConfig } from 'vite'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  server: {
    // Crucial: tells Vite to run without its own HTTP server wrapper
    middlewareMode: true,
  },
  resolve: {
    alias: {
      '@bad-at-coding': path.resolve(__dirname, './'),
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'app/main.ts'),
      },
    },
  },
  appType: 'custom',
})
