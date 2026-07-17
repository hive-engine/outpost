const regex = {
  sanitize: /^https:\/\/w\.soundcloud\.com\/player\/.*?url=(.+?)&.*/i,
  main: /^(?:https?:\/\/)?(?:www\.)?(?:soundcloud\.com\/)(.*)?$/
}

export function validateIframeUrl (url) {
  const match = url.match(regex.sanitize)

  if (!match || match.length !== 2) {
    return false
  }

  return `https://w.soundcloud.com/player/?url=${match[1]}&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&visual=true`
}

function extractMetadata (data) {
  if (!data) { return null }

  const m = data.match(regex.main)
  if (!m || m.length < 2) { return null }

  return {
    id: m[1],
    url: m[0],
    canonical: `https://soundcloud.com/${m[1]}`
  }
}

export function embedNode (child, links, images) {
  try {
    const { data } = child
    const soundcloud = extractMetadata(data)

    if (!soundcloud) { return child }

    child.data = data.replace(soundcloud.url, `~~~ embed:${soundcloud.id} soundcloud ~~~`)

    if (links) { links.add(soundcloud.canonical) }
  } catch (error) {
    console.log(error)
  }

  return child
}

export function genIframeMd (idx, id, width, height, metadata, createElement) {
  const src = `https://w.soundcloud.com/player/?url=https://soundcloud.com/${id}&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&visual=true`

  return createElement('iframe', {
    class: 'embed-responsive-item',
    key: `soundcloud-${idx}-${id}`,
    attrs: { width, height, src, allowfullscreen: true, sandbox: 'allow-scripts allow-same-origin allow-popups' }
  })
}
