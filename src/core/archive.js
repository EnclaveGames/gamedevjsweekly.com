import fs from 'node:fs'

function dtf(time) {
  return time.getFullYear()
    + '/'
    + ('00' + (time.getMonth() + 1)).slice(-2)
    + '/'
    + ('00' + time.getDate()).slice(-2)
}

let cached = []
export async function getArchive() {
  if (cached.length) return cached

  const response = await fetch('https://us3.api.mailchimp.com/3.0/campaigns?folder_id=73571a9f27&count=1000&sort_field=send_time&fields=campaigns.id,campaigns.send_time,campaigns.settings.subject_line,campaigns.social_card.image_url', {
    headers: {
      Authorization: import.meta.env.MAILCHIMP_AUTH
    }
  })

  if (!response.ok) {
    throw new Error(response.status + ': ' + await response.text())
  }

  const src = (await response.json()).campaigns
  for (let i = 0; i < src.length; i++) {
    const
      v   = src[i],
      idx = i + 1

    let title = ''
    if (i >= 240) {
      title = v.settings.subject_line.replace(/^(.*?): /gi, '')

      // Naive but simple enough to avoid a re-allocation (and regex) just to compare a letter.
      // In case the first  char is not ASCII this will not work, of course, but does the trick
      // otherwise.
      //
      // TODO(alcore) Ideally we'd have this fixed straight at the data source, but data and content
      // consistency is not Ender's strong suit...
      let c = title.charCodeAt(0)
      if (c > 90) {
        title = title[0].toUpperCase() + title.slice(1)
      }
    }

    // Insert in reverse order (i.e. newest first)
    cached[src.length - idx] = {
      i:     idx,
      id:    v.id,
      title: title ? title : 'Gamedev.js Weekly #' + idx,
      // Note: Not all issues have a OG image. Some of the earliest ones have none at all, while many afterward
      // reuse a common "header image" instead of a proper, dedicated image.
      image: v.social_card?.image_url,
      // Note: Those are ISO 8601, so no need to process them in any other way than for display.
      // TODO(alcore) However, a nicer display format would be welcome (and whether this should be precomputed at
      // all is a different question).
      dt:    v.send_time,
      at:    dtf(new Date(v.send_time))
    }
  }

  return cached
}
