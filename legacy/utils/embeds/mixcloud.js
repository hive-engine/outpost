const regex = {
  main: /(?:https?:\/\/(?:(?:www\.mixcloud.com(\/(.*?)\/(.*?)\/))))/i,
  sanitize: /^https:\/\/www\.mixcloud\.com\/widget\/iframe\/.*?feed=(.*)/i
}

export function getIframeDimensions () {
  return {
    width: '100%',
    height: '120'
  }
}

export function validateIframeUrl (url) {
  const match = url.match(regex.sanitize)

  if (!match || match.length !== 2) {
    return false
  }

  return `https://www.mixcloud.com/widget/iframe/?hide_cover=1&feed=${match[1]}`
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
    canonical: `https://open.mixcloud.com/playlist/${m[1]}`
  }
}

export function embedNode (child, links, images) {
  try {
    const { data } = child
    const mixcloud = extractMetadata(data)
    if (!mixcloud) { return child }

    child.data = data.replace(
      mixcloud.url,
      `~~~ embed:${mixcloud.id} mixcloud ~~~`
    )

    if (links) { links.add(mixcloud.canonical) }
  } catch (error) {
    console.log(error)
  }
  return child
}

export function genIframeMd (idx, id, width, height, metadata, createElement) {
  width = '100%'
  height = 120

  const src = `https://www.mixcloud.com/widget/iframe/?hide_cover=1&feed=${id}`

  return createElement('iframe', {
    class: 'embed-responsive-item',
    key: `mixcloud-${idx}-${id}`,
    attrs: { width, height, src, allowfullscreen: true, sandbox: 'allow-scripts allow-same-origin allow-popups' }
  })
}
