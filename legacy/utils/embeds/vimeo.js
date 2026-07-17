const regex = {
  sanitize: /^(https?:)?\/\/player\.vimeo\.com\/video\/([0-9]*)/i,
  main: /https?:\/\/(?:vimeo\.com\/|player\.vimeo\.com\/video\/)([0-9]+)\/?(#t=((\d+)s?))?\/?/,
  contentId: /(?:vimeo\.com\/|player\.vimeo\.com\/video\/)([0-9]+)/
}

export function validateIframeUrl (url) {
  const match = url.match(regex.sanitize)

  if (!match || match.length !== 3) {
    return false
  }

  return 'https://player.vimeo.com/video/' + match[2]
}

function extractMetadata (data) {
  if (!data) { return null }
  const m = data.match(regex.main)
  if (!m || m.length < 2) { return null }

  const startTime = m.input.match(/t=(\d+)s?/)

  return {
    id: m[1],
    url: m[0],
    startTime: startTime ? startTime[1] : 0,
    canonical: `https://player.vimeo.com/video/${m[1]}`
  }
}

export function embedNode (child, links, images) {
  try {
    const { data } = child
    const vimeo = extractMetadata(data)
    if (!vimeo) { return child }

    const vimeoRegex = new RegExp(`${vimeo.url}(#t=${vimeo.startTime}s?)?`)
    if (vimeo.startTime > 0) {
      child.data = data.replace(
        vimeoRegex,
        `~~~ embed:${vimeo.id} vimeo ${vimeo.startTime} ~~~`
      )
    } else {
      child.data = data.replace(
        vimeoRegex,
        `~~~ embed:${vimeo.id} vimeo ~~~`
      )
    }

    if (links) { links.add(vimeo.canonical) }
    // if(images) images.add(vimeo.thumbnail) // not available
  } catch (error) {
    console.log(error)
  }
  return child
}

export function genIframeMd (idx, id, width, height, startTime, createElement) {
  const src = `https://player.vimeo.com/video/${id}#t=${startTime}s`

  return createElement('iframe', {
    class: 'embed-responsive-item',
    key: `vimeo-${idx}-${id}`,
    attrs: { width, height, src, allowfullscreen: true }
  })
}
