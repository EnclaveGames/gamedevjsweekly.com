import { defineConfig } from 'astro/config'

// https://astro.build/config
export default defineConfig({
  site: 'https://gamedevjsweekly.com',
  trailingSlash: 'never',
  build: {
    format: 'file'
  },
  vite: {
    build: {
      cssMinify: 'lightningcss'
    }
  }
})
