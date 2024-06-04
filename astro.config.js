import { defineConfig } from 'astro/config'

// https://astro.build/config
export default defineConfig({
  trailingSlash: 'never',
  build: {
    format: 'file'
  },
  vite: {
    build: {
      cssMinify: 'lightningcss'
    }
  },
})
