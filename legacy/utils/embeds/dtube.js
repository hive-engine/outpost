const regex = {
  // eslint-disable-next-line no-useless-escape
  sanitize: /^https:\/\/emb\.d\.tube\/#!\/([a-zA-Z0-9.\-\/]+)$/,
  // eslint-disable-next-line no-useless-escape
  main: /https:\/\/(?:emb\.)?(?:d\.tube\/#!\/(?:v\/)?)([a-zA-Z0-9.\-\/]*)/,
  // eslint-disable-next-line no-useless-escape
  contentId: /(?:d\.tube\/#!\/(?:v\/)?([a-zA-Z0-9.\-\/]*))+/
}

export function validateIframeUrl (url) {
  const match = url.match(regex.sanitize)

  if (match) {
    return url
  }

  return false
}

function extractMetadata (data) {
  if (!data) { return null }

  const m = data.match(regex.main)
  if (!m || m.length < 2) { return null }

  return {
    id: m[1],
    url: m[0],
    canonical: `https://emb.d.tube/#!/${m[1]}`
  }
}

export function embedNode (child, links, images) {
  try {
    const { data } = child
    const dtube = extractMetadata(data)
    if (!dtube) { return child }

    child.data = data.replace(dtube.url, `~~~ embed:${dtube.id} dtube ~~~`)

    if (links) { links.add(dtube.canonical) }
  } catch (error) {
    console.log(error)
  }

  return child
}

export function genIframeMd (idx, dtubeId, width, height, metadata, createElement) {
  const src = `https://emb.d.tube/#!/${dtubeId}`

  return createElement('iframe', {
    class: 'embed-responsive-item',
    key: `dtube-${idx}-${dtubeId}`,
    attrs: { width, height, src, allowfullscreen: true, sandbox: 'allow-scripts allow-same-origin' }
  })
}

export default {
  embedNode,
  genIframeMd
}
