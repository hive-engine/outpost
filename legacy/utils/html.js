// Adapted from https://github.com/hive-engine/nitrous/blob/master/src/app/utils/Html.js

const htmlCharMap = {
  amp: '&',
  quot: '"',
  lsquo: '‘',
  rsquo: '’',
  sbquo: '‚',
  ldquo: '“',
  rdquo: '”',
  bdquo: '„',
  hearts: '♥',
  trade: '™',
  hellip: '…',
  pound: '£',
  copy: ''
}

export const htmlDecode = txt =>
  txt.replace(/&[a-z]+;/g, (ch) => {
    const char = htmlCharMap[ch.substring(1, ch.length - 1)]
    return char || ch
  })
