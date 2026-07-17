// Adapted from https://github.com/hive-engine/nitrous/blob/master/src/shared/HtmlReady.js

import xmldom from 'xmldom'
import * as Phishing from '@/utils/phishing'
import linksRe, { any as linksAny } from '@/utils/links'
import { proxifyImageUrl } from '@/utils/proxify-url'
import { validateAccountName } from '@/utils/validations'
import { EmbeddedPlayerEmbedNode, preprocessHtml } from '@/utils/embeds'

const noop = () => {}

const DOMParser = new xmldom.DOMParser({ errorHandler: { warning: noop, error: noop } })
const XMLSerializer = new xmldom.XMLSerializer()

export const getPhishingWarningMessage = () => 'Link expanded to plain text; beware of a potential phishing attempt'
export const getExternalLinkWarningMessage = () => 'This link will take you away from the app'

function link (state, child) {
  const url = child.getAttribute('href')

  if (url) {
    state.links.add(url)

    if (state.mutate) {
      // If this link is not relative, http, https, steem or esteem -- add https.
      if (!/^((#)|(\/(?!\/))|(((steem|esteem|https?):)?\/\/))/.test(url)) {
        child.setAttribute('href', 'https://' + url)
      }

      // Unlink potential phishing attempts
      if ((url.indexOf('#') !== 0 && // Allow in-page links
          (child.textContent.match(/(www\.)?steemit\.com/i) && !url.match(/https?:\/\/(.*@)?(www\.)?steemit\.com/i))) || Phishing.looksPhishy(url)) {
        const phishyDiv = child.ownerDocument.createElement('div')
        phishyDiv.textContent = `${child.textContent} / ${url}`
        phishyDiv.setAttribute('title', getPhishingWarningMessage())
        phishyDiv.setAttribute('class', 'phishy')
        child.parentNode.replaceChild(phishyDiv, child)
      }
    }
  }
}

// wrap iframes in div.videoWrapper to control size/aspect ratio
function iframe (state, child) {
  // const url = child.getAttribute('src')

  // @TODO move this into the centralized EmbeddedPlayer code
  // if (url) {
  //   const { images, links } = state
  //   const yt = youTubeId(url)
  //   if (yt && images && links) {
  //     links.add(yt.url)
  //     images.add('https://img.youtube.com/vi/' + yt.id + '/0.jpg')
  //   }
  // }

  const { mutate } = state
  if (!mutate) { return }

  const tag = child.parentNode.tagName
    ? child.parentNode.tagName.toLowerCase()
    : child.parentNode.tagName
  if (
    tag === 'div' &&
    child.parentNode.getAttribute('class') === 'embed-responsive embed-responsive-16by9'
  ) { return }
  const html = XMLSerializer.serializeToString(child)
  child.parentNode.replaceChild(
    DOMParser.parseFromString(`<div class="embed-responsive embed-responsive-16by9">${html}</div>`),
    child
  )
}

function img (state, child) {
  const url = child.getAttribute('src')
  if (url) {
    state.images.add(url)
    if (state.mutate) {
      let url2 = ipfsPrefix(url)
      if (/^\/\//.test(url2)) {
        // Change relative protocol imgs to https
        url2 = 'https:' + url2
      }
      if (url2 !== url) {
        child.setAttribute('src', url2)
      }
    }
  }
}

function table (state, child) {
  child.setAttribute('class', 'table table-striped table-sm')
}

function proxifyImages (doc) {
  if (!doc) { return }

  Array.from(doc.getElementsByTagName('img')).forEach((node) => {
    const url = node.getAttribute('src')

    if (!linksRe.local.test(url)) {
      node.setAttribute('src', proxifyImageUrl(url, true))
    }
  })
}

function linkifyNode (child, state) {
  try {
    const tag = child.parentNode.tagName
      ? child.parentNode.tagName.toLowerCase()
      : child.parentNode.tagName
    if (tag === 'code') { return }
    if (tag === 'a') { return }

    const { mutate } = state
    if (!child.data) { return }

    child = EmbeddedPlayerEmbedNode(child, state.links, state.images)

    const data = XMLSerializer.serializeToString(child)

    const content = linkify(
      data,
      state.mutate,
      state.hashtags,
      state.usertags,
      state.images,
      state.links
    )

    if (mutate && content !== data) {
      const newChild = DOMParser.parseFromString(
        `<span>${content}</span>`
      )
      child.parentNode.replaceChild(newChild, child)
      return newChild
    }
  } catch (error) {
    console.error('linkify_error', error)
  }
}

function linkify (content, mutate, hashtags, usertags, images, links) {
  // hashtag
  content = content.replace(/(^|\s)(#[-a-z\d]+)/gi, (tag) => {
    if (/#[\d]+$/.test(tag)) { return tag } // Don't allow numbers to be tags
    const space = /^\s/.test(tag) ? tag[0] : ''
    const tag2 = tag.trim().substring(1)
    const tagLower = tag2.toLowerCase()
    if (hashtags) { hashtags.add(tagLower) }
    if (!mutate) { return tag }
    return space + `<a href="/trending/${tagLower}">${tag}</a>`
  })

  // usertag (mention)
  // Cribbed from https://github.com/twitter/twitter-text/blob/v1.14.7/js/twitter-text.js#L90
  content = content.replace(
    /(^|[^a-zA-Z0-9_!#$%&*@＠/]|(^|[^a-zA-Z0-9_+~.-/#]))[@＠]([a-z][-.a-z\d]+[a-z\d])/gi,
    (match, preceeding1, preceeding2, user) => {
      const userLower = user.toLowerCase()
      const valid = validateAccountName(userLower) == null

      if (valid && usertags) { usertags.add(userLower) }

      const preceedings = (preceeding1 || '') + (preceeding2 || '') // include the preceeding matches if they exist

      if (!mutate) { return `${preceedings}${user}` }

      return valid
        ? `${preceedings}<a href="/@${userLower}">@${user}</a>`
        : `${preceedings}@${user}`
    }
  )

  content = content.replace(linksAny('gi'), (ln) => {
    if (linksRe.image.test(ln)) {
      if (images) { images.add(ln) }
      return `<img src="${ipfsPrefix(ln)}" />`
    }

    // do not linkify .exe or .zip urls
    if (/\.(zip|exe)$/i.test(ln)) { return ln }

    // do not linkify phishy links
    if (Phishing.looksPhishy(ln)) {
      return `<div title='${getPhishingWarningMessage()}' class='phishy'>${ln}</div>`
    }

    if (links) { links.add(ln) }
    return `<a href="${ipfsPrefix(ln)}">${ln}</a>`
  })

  return content
}

function ipfsPrefix (url) {
  return url
}

function traverse (node, state, depth = 0) {
  if (!node || !node.childNodes) { return }

  Array.from(node.childNodes).forEach((child) => {
    // console.log(depth, 'child.tag,data', child.tagName, child.data)
    const tag = child.tagName ? child.tagName.toLowerCase() : null
    if (tag) { state.htmltags.add(tag) }

    if (tag === 'img') {
      img(state, child)
    } else if (tag === 'iframe') {
      iframe(state, child)
    } else if (tag === 'a') {
      link(state, child)
    } else if (tag === 'table') {
      table(state, child)
    } else if (child.nodeName === '#text') {
      linkifyNode(child, state)
    }

    traverse(child, state, depth + 1)
  })
}

export default function (html, { mutate = true, hideImages = false } = {}) {
  const state = { mutate }
  state.hashtags = new Set()
  state.usertags = new Set()
  state.htmltags = new Set()
  state.images = new Set()
  state.links = new Set()

  try {
    const doc = DOMParser.parseFromString(preprocessHtml(html), 'text/html')

    traverse(doc, state)

    if (mutate) {
      if (hideImages) {
        for (const image of Array.from(
          doc.getElementsByTagName('img')
        )) {
          const pre = doc.createElement('pre')
          pre.setAttribute('class', 'image-url-only')
          pre.appendChild(
            doc.createTextNode(image.getAttribute('src'))
          )
          image.parentNode.replaceChild(pre, image)
        }
      } else {
        proxifyImages(doc)
      }
    }

    // console.log('state', state)
    if (!mutate) { return state }

    return {
      html: doc ? XMLSerializer.serializeToString(doc) : '',
      ...state
    }
  } catch (error) {
    // xmldom error is bad
    console.error(
      'rendering error',
      JSON.stringify({ error: error.message, html })
    )
    return { html: '' }
  }
}
