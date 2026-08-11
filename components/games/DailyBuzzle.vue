<template>
  <div class="buzzle">
    <div class="bz-head">
      <h2>🐝 Daily Buzzle</h2>
      <div class="bz-streak" v-if="loggedIn">🔥 {{ streak }} <span>day streak</span></div>
    </div>

    <p v-if="status === 'anon'" class="bz-anon">Log in to play today's puzzle and build your streak.</p>

    <template v-else>
      <!-- grid -->
      <div class="bz-grid" :style="{ '--cols': wordLen }">
        <template v-for="(row, r) in rows" :key="r">
          <div
            v-for="(tile, c) in row"
            :key="`${r}-${c}`"
            class="bz-tile"
            :class="[tile.state, { pop: tile.pop }]"
          >{{ tile.letter }}</div>
        </template>
      </div>

      <p v-if="error" class="bz-error">{{ error }}</p>

      <!-- result banner -->
      <div v-if="finished" class="bz-result">
        <div class="bz-result-title">
          {{ status === 'won' ? '🎉 Solved!' : '😔 Out of guesses' }}
        </div>
        <p v-if="status === 'lost'" class="bz-answer">The word was <b>{{ (answer || '').toUpperCase() }}</b></p>
        <p class="bz-back">🔥 Streak {{ streak }} · best {{ maxStreak }} · come back tomorrow for a new word!</p>
        <button class="bz-share" @click="share">{{ shared ? '✓ Copied' : '📋 Share result' }}</button>
      </div>

      <!-- on-screen keyboard -->
      <div v-else class="bz-kb">
        <div v-for="(kbRow, i) in keyboard" :key="i" class="bz-kb-row">
          <button
            v-for="key in kbRow"
            :key="key"
            class="bz-key"
            :class="[keyStates[key] || '', { wide: key === 'ENTER' || key === 'DEL' }]"
            :disabled="submitting"
            @click="press(key)"
          >
            <span v-if="key === 'DEL'">⌫</span>
            <span v-else>{{ key }}</span>
          </button>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
// Daily Buzzle — Wordle-style, server-authoritative (the answer never reaches the
// client until the puzzle is finished). Supports the on-screen keyboard and the
// physical keyboard; one shared word per UTC day.
import { useAuthStore } from '~/stores/auth'
import { track } from '~/utils/track'

const auth = useAuthStore()

const wordLen = ref(5)
const maxGuesses = ref(6)
const day = ref('')
const guesses = ref([]) // [{ word, result: ['correct'|'present'|'absent', ...] }]
const status = ref('loading') // loading | playing | won | lost | anon
const answer = ref('')
const streak = ref(0)
const maxStreak = ref(0)
const current = ref('')
const error = ref('')
const submitting = ref(false)
const shared = ref(false)

const loggedIn = computed(() => auth.loggedIn)
const finished = computed(() => status.value === 'won' || status.value === 'lost')

const keyboard = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'DEL']
]

// Grid: submitted guesses (coloured), the active typing row, then blanks.
const rows = computed(() => {
  const out = []
  for (let r = 0; r < maxGuesses.value; r++) {
    const g = guesses.value[r]
    if (g) {
      out.push(g.word.toUpperCase().split('').map((letter, i) => ({ letter, state: g.result[i], pop: false })))
    } else if (r === guesses.value.length && status.value === 'playing') {
      const buf = current.value.toUpperCase().split('')
      out.push(Array.from({ length: wordLen.value }, (_, i) => ({ letter: buf[i] || '', state: buf[i] ? 'filled' : 'empty', pop: !!buf[i] })))
    } else {
      out.push(Array.from({ length: wordLen.value }, () => ({ letter: '', state: 'empty', pop: false })))
    }
  }
  return out
})

// Best-known state per letter for keyboard colouring (correct > present > absent).
const keyStates = computed(() => {
  const rank = { absent: 1, present: 2, correct: 3 }
  const map = {}
  for (const g of guesses.value) {
    g.word.toUpperCase().split('').forEach((ch, i) => {
      const s = g.result[i]
      if (!map[ch] || rank[s] > rank[map[ch]]) { map[ch] = s }
    })
  }
  return map
})

function applyState (s) {
  wordLen.value = s.wordLen || 5
  maxGuesses.value = s.maxGuesses || 6
  day.value = s.day
  guesses.value = s.guesses || []
  status.value = s.status
  answer.value = s.answer || ''
  streak.value = s.streak || 0
  maxStreak.value = s.maxStreak || 0
}

async function fetchState () {
  try {
    const s = await $fetch('/api/v1/games/puzzle')
    applyState(s)
  } catch {
    status.value = 'anon'
  }
}

function press (key) {
  if (status.value !== 'playing' || submitting.value) { return }
  error.value = ''
  if (key === 'ENTER') { return submit() }
  if (key === 'DEL') { current.value = current.value.slice(0, -1); return }
  if (/^[A-Z]$/.test(key) && current.value.length < wordLen.value) { current.value += key.toLowerCase() }
}

async function submit () {
  if (current.value.length !== wordLen.value || submitting.value) { return }
  submitting.value = true
  try {
    const s = await $fetch('/api/v1/games/puzzle', { method: 'POST', body: { guess: current.value } })
    const wasPlaying = status.value === 'playing'
    applyState(s)
    current.value = ''
    if (wasPlaying && (s.status === 'won' || s.status === 'lost')) {
      track('buzzle-result', { result: s.status, guesses: s.guesses.length })
    }
  } catch (e) {
    error.value = (e && e.statusMessage) || 'Could not submit that guess.'
  } finally {
    submitting.value = false
  }
}

function onKeyDown (e) {
  if (status.value !== 'playing') { return }
  if (e.key === 'Enter') { press('ENTER') } else if (e.key === 'Backspace') { press('DEL') } else {
    const k = e.key.toUpperCase()
    if (/^[A-Z]$/.test(k)) { press(k) }
  }
}

function share () {
  const emoji = { correct: '🟩', present: '🟨', absent: '⬛' }
  const grid = guesses.value.map(g => g.result.map(s => emoji[s]).join('')).join('\n')
  const header = `🐝 Daily Buzzle ${day.value} — ${status.value === 'won' ? guesses.value.length : 'X'}/${maxGuesses.value}`
  const text = `${header}\n${grid}\nPlay at ${config.public?.APP_DOMAIN || 'the BBH Project'}/puzzle`
  if (import.meta.client && navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => { shared.value = true; setTimeout(() => { shared.value = false }, 2000) }).catch(() => {})
  }
}

const config = useRuntimeConfig()

onMounted(() => {
  fetchState()
  window.addEventListener('keydown', onKeyDown)
})
onBeforeUnmount(() => window.removeEventListener('keydown', onKeyDown))
watch(() => auth.loggedIn, () => fetchState())
</script>

<style scoped>
.buzzle { max-width: 400px; margin: 0 auto; }
.bz-head { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: .8rem; }
.bz-head h2 { font-weight: 800; font-size: 1.2rem; margin: 0; }
.bz-streak { font-weight: 700; color: var(--w3-gold, #f5b800); }
.bz-streak span { font-size: .72rem; color: var(--w3-muted); font-weight: 500; }
.bz-anon { color: var(--w3-muted); text-align: center; padding: 2rem 0; }

.bz-grid { display: grid; grid-template-columns: repeat(var(--cols), 1fr); gap: .4rem; margin: 0 auto .9rem; }
.bz-tile {
  aspect-ratio: 1;
  display: flex; align-items: center; justify-content: center;
  font-size: 1.6rem; font-weight: 800; text-transform: uppercase;
  border: 2px solid var(--w3-border);
  border-radius: 8px;
  color: var(--w3-text);
  transition: transform .1s ease, background .2s ease, border-color .2s ease;
}
.bz-tile.empty { background: transparent; }
.bz-tile.filled { border-color: var(--w3-muted); }
.bz-tile.pop { transform: scale(1.06); }
.bz-tile.correct { background: #2ecc71; border-color: #2ecc71; color: #06210f; }
.bz-tile.present { background: var(--w3-gold, #f5b800); border-color: var(--w3-gold, #f5b800); color: #1a1206; }
.bz-tile.absent { background: var(--w3-panel-2, #33343a); border-color: var(--w3-panel-2, #33343a); color: #cfcfd6; }

.bz-error { color: #ff8a8a; text-align: center; font-size: .85rem; margin: -.4rem 0 .6rem; }

.bz-result { text-align: center; background: var(--w3-panel); border: 1px solid var(--w3-border); border-radius: 14px; padding: 1rem; }
.bz-result-title { font-size: 1.3rem; font-weight: 800; }
.bz-answer { margin: .4rem 0 0; }
.bz-answer b { color: var(--w3-gold, #f5b800); letter-spacing: .1em; }
.bz-back { font-size: .82rem; color: var(--w3-muted); margin: .5rem 0 .8rem; }
.bz-share {
  border: none; border-radius: 999px; font-weight: 800; padding: .5rem 1.4rem; cursor: pointer;
  background: linear-gradient(135deg, var(--w3-gold, #f5b800), #ffd34d); color: #1a1206;
}

.bz-kb { display: flex; flex-direction: column; gap: .4rem; }
.bz-kb-row { display: flex; justify-content: center; gap: .3rem; }
.bz-key {
  min-width: 30px; height: 48px; padding: 0 .5rem;
  border: none; border-radius: 6px; cursor: pointer;
  background: var(--w3-panel-2, #3a3b42); color: var(--w3-text);
  font-weight: 700; font-size: .9rem;
  transition: background .15s ease, transform .1s ease;
}
.bz-key:hover:not(:disabled) { transform: translateY(-1px); }
.bz-key.wide { min-width: 52px; font-size: .72rem; }
.bz-key.correct { background: #2ecc71; color: #06210f; }
.bz-key.present { background: var(--w3-gold, #f5b800); color: #1a1206; }
.bz-key.absent { background: #1f2024; color: #6b6c73; }
</style>
