// Adapted from https://github.com/hive-engine/nitrous/blob/master/src/app/utils/ExtractContent.js
import { Remarkable } from 'remarkable'
import sanitize from 'sanitize-html'
import Apps from '@hiveio/hivescript/apps.json'
import HtmlReady from '@/utils/HtmlReady'
import remarkableStripper from '@/utils/remarkable-stripper'
import { htmlDecode } from '@/utils/html'

const remarkable = new Remarkable({ html: true })

const getValidImage = (array) => {
  return array && Array.isArray(array) && array.length >= 1 && typeof array[0] === 'string' ? array[0] : null
}

export const extractRtags = (body = null) => {
  let rtags
  {
    const isHtml = /^<html>([\S\s]*)<\/html>$/.test(body)
    const htmlText = isHtml
      ? body
      : remarkable.render(body.replace(/<!--([\s\S]+?)(-->|$)/g, '(html comment removed: $1)'))
    rtags = HtmlReady(htmlText, { mutate: false })
  }

  return rtags
}

export const extractImageLink = (jsonMetadata, body = null) => {
  let json = jsonMetadata

  if (typeof json === 'string') {
    try {
      json = JSON.parse(jsonMetadata)
    } catch {
      json = null
    }
  }

  if (!json) { json = {} }

  const jsonImage = json.image ? json.image : null

  let imageLink

  try {
    imageLink = jsonImage ? getValidImage(Array.from(jsonImage)) : null
  } catch (error) { }

  // If nothing found in json metadata, parse body and check images/links
  if (!imageLink) {
    const rtags = extractRtags(body)

    if (rtags.images) {
      [imageLink] = Array.from(rtags.images)
    }
  }

  // Was causing broken thumnails.  IPFS was not finding images uploaded to another server until a restart.
  // if(config.ipfs_prefix && imageLink) // allow localhost nodes to see ipfs images
  //     imageLink = imageLink.replace(links.ipfsPrefix, config.ipfs_prefix)

  return imageLink
}

export const extractBodySummary = (body, stripQuotes = false) => {
  let desc = body

  if (stripQuotes) { desc = desc.replace(/(^(\n|\r|\s)*)>([\s\S]*?).*\s*/g, '') }
  desc = remarkableStripper.render(desc) // render markdown to html
  desc = sanitize(desc, { allowedTags: [] }) // remove all html, leaving text
  desc = htmlDecode(desc)

  // Strip any raw URLs from preview text
  desc = desc.replace(/https?:\/\/[^\s]+/g, '')

  // Grab only the first line (not working as expected. does rendering/sanitizing strip newlines?)
  desc = desc.trim().split('\n')[0]

  if (desc.length > 200) {
    desc = desc.substring(0, 200).trim()

    // Truncate, remove the last (likely partial) word (along with random punctuation), and add ellipses
    desc = desc
      .substring(0, 180)
      .trim()
      .replace(/[,!?]?\s+[^\s]+$/, '…')
  }

  return desc
}

export const extractCanonicalLink = (jsonMetadata, category, author, permlink) => {
  let json = jsonMetadata
  let url = null

  if (typeof json === 'string') {
    try {
      json = JSON.parse(jsonMetadata)
    } catch {
      json = null
    }
  }

  if (!json) {
    return url
  }

  url = json.canonical_url && typeof json.canonical_url === 'string' ? json.canonical_url : null

  url = /^https?:\/\//.test(url) ? url : null

  if (url) {
    return url
  }

  const app = json && json.app && typeof json.app === 'string' && json.app.split('/').length === 2 ? json.app.split('/')[0] : null

  if (app && Apps[app]) {
    const scheme = Apps[app].url_scheme

    url = scheme.replace('{category}', category).replace('{username}', author).replace('{permlink}', permlink)
  }

  return url
}
