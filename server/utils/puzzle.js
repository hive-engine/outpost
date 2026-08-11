// Daily Buzzle — a Wordle-style daily puzzle, server-authoritative so the answer
// never ships to the client. One shared word per UTC day; scoring is the standard
// Wordle two-pass (handles duplicate letters). Word list is server-only.

// Curated 5-letter answers — common words plus a few Hive/bee-themed ones
// (HONEY, DRONE, QUEEN, SWARM, COMBS, BLOCK, CHAIN, TOKEN, MINER, STAKE, TRADE,
// POWER, HIVES, TRIBE, VOTES, COINS, PRIZE). Kept lowercase.
export const ANSWERS = [
  'crane', 'slate', 'house', 'mouse', 'world', 'plant', 'brick', 'chair', 'table', 'glass',
  'water', 'stone', 'river', 'ocean', 'beach', 'cloud', 'storm', 'light', 'night', 'dream',
  'heart', 'smile', 'laugh', 'dance', 'music', 'voice', 'happy', 'lucky', 'magic', 'angel',
  'brave', 'sweet', 'fresh', 'green', 'black', 'white', 'brown', 'pearl', 'amber', 'coral',
  'ivory', 'honey', 'drone', 'queen', 'swarm', 'combs', 'block', 'chain', 'token', 'miner',
  'stake', 'trade', 'power', 'hives', 'tribe', 'votes', 'coins', 'price', 'value', 'vault',
  'cards', 'arena', 'medal', 'crown', 'glory', 'prize', 'bonus', 'pixel', 'robot', 'laser',
  'orbit', 'comet', 'solar', 'lunar', 'earth', 'plane', 'train', 'truck', 'wheel', 'brake',
  'speed', 'track', 'field', 'court', 'score', 'teams', 'coach', 'fruit', 'apple', 'mango',
  'peach', 'berry', 'grape', 'lemon', 'olive', 'wheat', 'bread', 'sugar', 'spice', 'candy',
  'cocoa', 'toast', 'feast', 'plate', 'spoon', 'knife', 'bowls', 'roast', 'grill', 'curry',
  'salad', 'beans', 'tiger', 'zebra', 'koala', 'panda', 'sloth', 'otter', 'whale', 'shark',
  'eagle', 'robin', 'finch', 'swans', 'ducks', 'moths', 'wasps', 'gecko', 'snake', 'frogs',
  'crabs', 'clams', 'mints', 'chess', 'poker', 'flute', 'piano', 'drums', 'paint', 'brush',
  'novel', 'story', 'poems', 'verse', 'rhyme', 'lyric', 'globe', 'atlas', 'north', 'south'
].filter(w => /^[a-z]{5}$/.test(w))

// De-dupe while preserving order.
const SEEN = new Set()
const WORDS = ANSWERS.filter(w => (SEEN.has(w) ? false : (SEEN.add(w), true)))

// UTC day string YYYY-MM-DD.
export function puzzleDay (ts = Date.now()) {
  return new Date(ts).toISOString().slice(0, 10)
}

// Deterministic day index → word. Scrambled by a coprime multiplier so the order
// isn't the raw list order (defence in depth; the list is server-only anyway).
export function wordForDay (dayStr) {
  const epoch = Date.UTC(2026, 0, 1) / 86400000
  const day = Math.floor(new Date(dayStr + 'T00:00:00Z').getTime() / 86400000)
  const idx = (((day - epoch) * 97) % WORDS.length + WORDS.length) % WORDS.length
  return WORDS[idx]
}

// Standard Wordle scoring with correct duplicate-letter handling.
// Returns an array of 'correct' | 'present' | 'absent'.
export function scoreGuess (guess, answer) {
  const res = new Array(5).fill('absent')
  const a = answer.split('')
  const g = guess.split('')

  // Pass 1: exact positions (green), consume matched answer letters.
  for (let i = 0; i < 5; i++) {
    if (g[i] === a[i]) { res[i] = 'correct'; a[i] = null }
  }
  // Remaining answer letter counts.
  const remaining = {}
  for (const c of a) { if (c) { remaining[c] = (remaining[c] || 0) + 1 } }
  // Pass 2: present-elsewhere (yellow).
  for (let i = 0; i < 5; i++) {
    if (res[i] === 'correct') { continue }
    const c = g[i]
    if (remaining[c] > 0) { res[i] = 'present'; remaining[c]-- }
  }
  return res
}

export const MAX_GUESSES = 6
export const WORD_LEN = 5

// Lenient guess validation: any 5 ASCII letters (no big dictionary shipped).
export function isValidGuess (guess) {
  return typeof guess === 'string' && /^[a-z]{5}$/.test(guess.toLowerCase())
}
