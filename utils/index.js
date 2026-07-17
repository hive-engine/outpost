// Utils barrel — PARTIAL port from legacy/utils/index.js.
// P1 ports only the pure helpers the Pinia stores need; the markdown/HtmlReady/
// tag helpers (which drag in remarkable + xmldom) land with the content layer in P4.

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

export const hasNsfwTag = (tags) => {
  return tags.includes('nsfw')
}
