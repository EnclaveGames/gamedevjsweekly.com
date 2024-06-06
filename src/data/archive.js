import { parse } from 'node-html-parser'
import fs        from 'node:fs'
import { Sema }  from 'async-sema'

function dtf(time) {
  return time.getFullYear()
    + '/'
    + ('00' + (time.getMonth() + 1)).slice(-2)
    + '/'
    + ('00' + time.getDate()).slice(-2)
}

function scrape(targetable, src) {
  // Cleanup prepass
  const dom = parse(src
    .replace(/ ((style|target)="([^"]*)")|([?&]utm_source=gamedevjsweekly&utm_medium=email)/gi, '')
    // Collapse consecutive whitespace characters into a single space.
    .replace(/\s+/gm, ' ')
    // (Unsafe) Remove whitespace between tags.
    .replace(/>\s*?</gm, '><')
    // Replace `href="https://` prefixes with protocol-relative prefixes.
    .replace(/f="https:\/\//gi, 'f="//')
    // Clean up `<br> &nbsp;</p>
    .replace(/<br> &nbsp;<\/p>/gi, '</p>')
    // Clean up `<h4>Games:</h4>`, removing the colons and replacing any encountered heading with <h2>
    .replace(/<h\d>(.*?)<\/h\d>/gi, (_, c1) => `<h2>${c1[c1.length - 1] === ':' ? c1.slice(0, -1) : c1}</h2>`)
    // Remove surrounding whitespace.
    .trim())

  // There's a template change at issue #542 and content is no longer uniquely targetable,
  // which requires a split approach.
  let root
  if (targetable) {
    root = dom.querySelector('.bodyContent div')
    if (!root) {
      return null
    }
  } else {
    let parents = dom.querySelectorAll('.mcnTextContent')
    if (parents.length !== 3) {
      return null
    }

    root = parents[1]
  }

  // Entirely remove the `<h4>Issue #437 - May 20th 2022</h4>` header along with the intro note, *assuming*
  // it's them, since we have no other way to differentiate.
  const nodes = root.childNodes
  if (nodes[0].rawTagName === 'h2' && nodes[1].rawTagName === 'p') {
    root.childNodes = nodes.slice(2)
  }

  return root.innerHTML
}

// TODO(alcore) Ideally we'd love to avoid this, but it's currently unclear whether Cloudflare Pages will
// restore a cache over conflicting entries or not.
const buildCacheDir = 'node_modules/.astro'
fs.cpSync('.archive', buildCacheDir, {recursive: true})

const
  cache = [],
  sem   = new Sema(5),
  res   = await fetch('https://us3.api.mailchimp.com/3.0/campaigns?folder_id=73571a9f27&count=1000&sort_field=send_time&fields=campaigns.id,campaigns.send_time,campaigns.settings.subject_line,campaigns.social_card.image_url', {
    headers: {
      Authorization: import.meta.env.MAILCHIMP_AUTH
    }
  })

if (!res.ok) {
  throw new Error(res.status + ': ' + await res.text())
}

const
  prm = [],
  src = (await res.json()).campaigns

for (let i = 0; i < src.length; i++) {
  const
    remote = src[i],
    idx    = i + 1

  let title = ''
  if (idx >= 241) {
    title = remote.settings.subject_line.replace(/^(.*?): /gi, '')

    // Naive but simple enough to avoid a re-allocation (and regex) just to compare a letter.
    // In case the first char is not ASCII this will not work, of course, but does the trick otherwise.
    if (title.charCodeAt(0) > 96) {
      title = title[0].toUpperCase() + title.slice(1)
    }
  }

  // Insert in reverse order (i.e. newest first)
  const
    path = buildCacheDir + '/' + idx +'.html',
    data = cache[src.length - idx] = {
      i:     idx,
      id:    remote.id,
      title: title || 'Gamedev.js Weekly #' + idx,
      image: remote.social_card?.image_url,
      dt:    remote.send_time,
      at:    dtf(new Date(remote.send_time))
    }

  try {
    data.content = fs.readFileSync(path).toString()
  } catch (_) {
    prm.push(sem.acquire().then(async _ => {
      const res = await fetch('https://us3.api.mailchimp.com/3.0/campaigns/' + data.id + '/content?fields=archive_html', {
        headers: {
          Authorization: import.meta.env.MAILCHIMP_AUTH
        }
      })

      sem.release()

      if (!res.ok) {
        throw new Error(res.status + ': ' + await res.text())
      }

      data.content = scrape(idx < 542, (await res.json()).archive_html)
      if (!data.content) {
        throw new Error('Failed to parse ' + idx + ' | ' + data.id)
      }

      fs.writeFileSync(path, data.content)
    }))
  }
}

await Promise.all(prm)

export default cache