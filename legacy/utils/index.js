import { Remarkable } from 'remarkable'
import HtmlReady from '@/utils/HtmlReady'
import { AUTO_ADD_COMMUNITY, COMMUNITY_CATEGORY, SCOT_TAG_FIRST, SCOT_TAG, MAX_TAG } from '@/config'

const remarkable = new Remarkable({ html: true, breaks: true })

export const isHtmlTest = text => /^<html>/.test(text)

export const stripHtmlWrapper = (text) => {
  const m = text.match(/<html>\n*([\S\s]+?)?\n*<\/html>/m)
  return m && m.length === 2 ? m[1] : text
}

export const stateFromMarkdown = (markdown) => {
  let html = ''

  if (markdown && markdown.trim() !== '') {
    html = remarkable.render(markdown)

    html = HtmlReady(html).html
  }

  return stripHtmlWrapper(html)
}

export const calculateReputation = (reputation) => {
  if (reputation == null) { return reputation }

  const neg = reputation < 0

  let rep = String(reputation)

  rep = neg ? rep.substring(1) : rep

  let v = (Math.log10((rep > 0 ? rep : -rep) - 10) - 9)

  if (Number.isNaN(v)) {
    return 0
  }

  v = neg ? -v : v

  return parseInt(v * 9 + 25)
}

export const allTags = (tags, originalCategory, hashtags, editing = false, isComment = false) => {
  tags = new Set(tags)

  if (SCOT_TAG_FIRST && !/^hive-[1-3]\d{4,6}$/.test(tags.values().next().value) && !editing) {
    tags = new Set([SCOT_TAG, ...tags])
  } else {
    tags = tags.add(SCOT_TAG)
  }

  if (AUTO_ADD_COMMUNITY && /^hive-[1-3]\d{4,6}$/.test(COMMUNITY_CATEGORY) && !/^hive-[1-3]\d{4,6}$/.test(tags.values().next().value) && !isComment) {
    tags = new Set([COMMUNITY_CATEGORY, ...tags])
  }

  // remove original category, if present
  if (originalCategory && /^[-a-z\d]+$/.test(originalCategory)) { tags = tags.delete(originalCategory) }

  // append hashtags from post until limit is reached
  const tagged = [...hashtags]

  while (tags.size < MAX_TAG && tagged.length > 0) {
    tags = tags.add(tagged.shift())
  }

  return tags
}

export const escapeHTML = (html) => {
  return html.replace(/[^0-9A-Za-z ]/g, c => '&#' + c.charCodeAt(0) + ';')
}

export const numberWithCommas = (x) => {
  return String(x)
}

export const toFixedWithoutRounding = (t, l = 3) => {
  const a = 10 ** l
  const s = t * a
  return Math.trunc(s) / a
}

export const arrayChunk = (array, size = 20) => {
  const chunkedArray = []
  let index = 0

  while (index < array.length) {
    chunkedArray.push(array.slice(index, size + index))
    index += size
  }

  return chunkedArray
}

export const formatNumumber = (number) => {
  const SI_SYMBOL = ['', 'k', 'M', 'G', 'T', 'P', 'E']

  const tier = Math.log10(Math.abs(number)) / 3 | 0

  if (tier === 0) { return number }

  const suffix = SI_SYMBOL[tier]
  const scale = Math.pow(10, tier * 3)

  const scaled = number / scale

  return scaled.toFixed(1) + suffix
}

export const hasNsfwTag = (tags) => {
  return tags.includes('nsfw')
}
