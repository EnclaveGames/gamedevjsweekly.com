import fs from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

import { defineConfig } from 'astro/config'
import sitemap          from '@astrojs/sitemap'
import { minify }       from 'html-minifier-terser'

// https://astro.build/config
export default defineConfig({
  site: 'https://gamedevjsweekly.com',
  trailingSlash: 'never',
  compressHTML: false,
  build: {
    format: 'file'
  },
  vite: {
    build: {
      cssMinify: 'lightningcss'
    }
  },
  integrations: [sitemap(), {
    name: 'gdjs:post:minify',
    hooks: {
      'astro:build:done': ({ dir, pages }) => Promise.all(pages.map(v => {
        const
          s = v.pathname || 'index',
          p = fileURLToPath(new URL(s + '.html', dir))

        return fs.readFile(p)
          .then(v => minify(v.toString(), {
            caseSensitive:                 true,
            keepClosingSlash:              true,
            collapseBooleanAttributes:     true,
            collapseInlineTagWhitespace:   false,
            collapseWhitespace:            true,
            minifyURLs:                    true,
            quoteCharacter:                "'",
            removeOptionalTags:            true,
            removeAttributeQuotes:         true,
            removeEmptyAttributes:         true,
            removeRedundantAttributes:     true,
            removeScriptTypeAttributes:    true,
            removeStyleLinkTypeAttributes: true,
            removeEmptyElements:           false,
            removeComments:                true,
            minifyJS:                      false,
            minifyCSS:                     {
              level: {
                1: { all: true },
                2: { all: true }
              }
            },
          }))
        .then(v => fs.writeFile(p, v))
      }))
    }
  }]
})
