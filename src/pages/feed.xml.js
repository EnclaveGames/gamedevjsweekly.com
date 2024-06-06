import rss     from '@astrojs/rss'

import archive from '../data/archive'

export function GET(ctx) {
  return rss({
    title: 'Gamedev.js Weekly',
    description: 'Weekly newsletter about web game development. Curated by Andrzej Mazur, creator of the js13kGames competition.',
    site: ctx.site,
    trailingSlash: false,
    items: archive.slice(0, 20).map(v => ({
      title: 'Issue #' + v.i + ': ' + v.title,
      pubDate: (new Date(v.dt)).toUTCString(),
      link: '/' + v.i
    }))
  })
}