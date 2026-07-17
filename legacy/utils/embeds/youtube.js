const regex = {
  sanitize: /^(https?:)?\/\/www\.youtube\.com\/embed\/.*/i,
  main: /(?:https?:\/\/)(?:www\.)?(?:(?:youtube\.com\/watch\?v=)|(?:youtu.be\/)|(?:youtube\.com\/embed\/))([A-Za-z0-9_-]+)[^ ]*/i,
  contentId: /(?:(?:youtube\.com\/watch\?v=)|(?:youtu.be\/)|(?:youtube\.com\/embed\/))([A-Za-z0-9_-]+)/i
}

export const sandboxConfig = {
  useSandbox: false,
  sandboxAttributes: []
}

export function validateIframeUrl (url) {
  const match = url.match(regex.sanitize)

  if (match) {
    // strip query string (yt: autoplay=1,controls=0,showinfo=0, etc)
    return url.replace(/\?.+$/, '')
  }

  return false
}

export const extractMetadata = (data) => {
  if (!data) { return null }

  const m1 = data.match(regex.main)

  const url = m1 ? m1[0] : null

  if (!url) { return null }

  const m2 = url.match(regex.contentId)
  const id = m2 && m2.length >= 2 ? m2[1] : null

  if (!id) { return null }

  const startTime = url.match(/t=(\d+)s?/)

  return {
    id,
    url,
    canonical: url,
    startTime: startTime ? startTime[1] : 0,
    thumbnail: 'https://img.youtube.com/vi/' + id + '/0.jpg'
  }
}

export const embedNode = (child, links, images) => {
  try {
    const yt = extractMetadata(child.data)

    if (!yt) { return child }

    if (yt.startTime) {
      child.data = child.data.replace(
        yt.url,
        `~~~ embed:${yt.id} youtube ${yt.startTime} ~~~`
      )
    } else {
      child.data = child.data.replace(
        yt.url,
        `~~~ embed:${yt.id} youtube ~~~`
      )
    }

    if (links) { links.add(yt.url) }
    if (images) { images.add(yt.thumbnail) }
  } catch (error) {
    console.log(error)
  }

  return child
}

export const genIframeMd = (idx, id, width, height, startTime, createElement) => {
  const dataParams = 'enablejsapi=0&rel=0'
  const autoPlaySrc = `https://www.youtube.com/embed/${id}?autoplay=0&autohide=1&${dataParams}&start=${startTime}`

  return createElement('iframe', {
    class: 'embed-responsive-item',
    key: `youtube-${idx}-${id}`,
    attrs: { width, height, src: autoPlaySrc, allowfullscreen: true }
  })
}

export default {
  embedNode,
  genIframeMd
}
