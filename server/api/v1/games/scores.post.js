// POST /api/v1/games/scores — submit a run's score for the logged-in user.
// Body: { game, score, wave }. Keeps only each account's personal best.
//
// MVP note: the score is client-reported and only sanity-clamped here — good
// enough for a friendly leaderboard. Before any BBHO stake/prize is attached the
// scoring must move server-authoritative (deterministic seed + replay/plausibility
// check), otherwise it's trivially farmable. Tracked as phase 2 of the game.
import { defineEventHandler, readBody, createError } from 'h3'
import { getAppSession } from '../../../utils/session'

const GAMES = {
  'bee-invaders': { maxScore: 5_000_000, maxWave: 500 }
}
const MAX_ENTRIES = 200

export default defineEventHandler(async (event) => {
  const session = await getAppSession(event)
  const user = session.data && session.data.user

  if (!user) { throw createError({ statusCode: 401, statusMessage: 'Unauthorized' }) }

  const body = await readBody(event).catch(() => ({}))
  const game = String(body.game || '')
  const cfg = GAMES[game]
  if (!cfg) { throw createError({ statusCode: 400, statusMessage: 'Unknown game' }) }

  const score = Math.max(0, Math.min(cfg.maxScore, Math.floor(Number(body.score) || 0)))
  const wave = Math.max(0, Math.min(cfg.maxWave, Math.floor(Number(body.wave) || 0)))

  const store = useStorage('scores')
  const data = (await store.getItem(game)) || { scores: [] }
  const list = Array.isArray(data.scores) ? data.scores : []

  const existing = list.find(s => s.user === user)
  let best = score
  if (existing) {
    best = Math.max(existing.score, score)
    if (score > existing.score) {
      existing.score = score
      existing.wave = wave
      existing.at = Date.now()
    }
  } else {
    list.push({ user, score, wave, at: Date.now() })
  }

  list.sort((a, b) => b.score - a.score || a.at - b.at)
  const top = list.slice(0, MAX_ENTRIES)

  await store.setItem(game, { scores: top, updatedAt: Date.now() })

  const idx = top.findIndex(s => s.user === user)

  return { ok: true, best, rank: idx >= 0 ? idx + 1 : null, scores: top.slice(0, 25) }
})
