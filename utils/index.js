import { Remarkable } from 'remarkable'
import HtmlReady from '@/utils/HtmlReady'
import { SCOT_TAG_FIRST, SCOT_TAG, MAX_TAG } from '@/config'

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

export const allTags = (tags, originalCategory, hashtags, editing = false) => {
  tags = new Set(tags)

  if (SCOT_TAG_FIRST && !editing) {
    tags = new Set([SCOT_TAG, ...tags])
  } else {
    tags = tags.add(SCOT_TAG)
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
  return String(x).replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ',')
}

export const toFixedWithoutRounding = (t, l = 3) => {
  const a = 10 ** l
  const s = t * a
  return Math.trunc(s) / a
}
