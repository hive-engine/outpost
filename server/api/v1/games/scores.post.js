// POST /api/v1/games/scores — submit a run's score for the logged-in user.
// Body: { game, score, wave, sessionId }. Keeps each account's personal best.
//
// Server-authoritative: the run must have been opened via /session (unused, owned
// by this user) and the score must be plausible for how long the run took. Ranked
// runs additionally require a verified BBHO entry payment and land on the weekly
// ranked board; free/casual runs land on the all-time casual board.
import { defineEventHandler, readBody, createError } from 'h3'
import { getAppSession } from '../../../utils/session'
import { ARCADE, weekKey, verifyEntryPayment, rankedBoardKey } from '../../../utils/arcade'

const GAMES = {
  // maxScorePerSec: generous ceiling for elapsed-time plausibility. minSec: the
  // shortest a real run scoring anything could take.
  'bee-invaders': { maxScore: 5_000_000, maxWave: 500, maxScorePerSec: 600, minSec: 2 }
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

  const sessionId = String(body.sessionId || '')
  const sessions = useStorage('gamesessions')
  const sess = await sessions.getItem(sessionId)

  if (!sess || sess.user !== user || sess.game !== game) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid or missing game session' })
  }
  if (sess.used) {
    throw createError({ statusCode: 409, statusMessage: 'Session already submitted' })
  }

  const elapsedSec = (Date.now() - sess.startedAt) / 1000
  const plausibleCeiling = elapsedSec * cfg.maxScorePerSec + 200
  if (score > 0 && (elapsedSec < cfg.minSec || score > plausibleCeiling)) {
    // Burn the session so a rejected run can't be retried against the same token.
    await sessions.setItem(sessionId, { ...sess, used: true })
    throw createError({ statusCode: 422, statusMessage: 'Implausible score for run duration' })
  }

  const mode = sess.mode === 'ranked' ? 'ranked' : 'free'

  // Ranked runs must be paid. Try a last-chance on-chain verification before
  // rejecting (payment may have settled after the run started). Do NOT mark the
  // session used on a payment miss, so the client can confirm + resubmit.
  if (mode === 'ranked' && !sess.paid) {
    const paid = await verifyEntryPayment({
      user,
      memo: sess.memo,
      amount: ARCADE.entryFee,
      sinceSec: Math.floor(sess.startedAt / 1000)
    })
    if (!paid) {
      throw createError({ statusCode: 402, statusMessage: 'Ranked entry payment not found yet' })
    }
    sess.paid = true
  }

  await sessions.setItem(sessionId, { ...sess, used: true, submittedAt: Date.now(), score })

  const boardKey = mode === 'ranked' ? rankedBoardKey(game, weekKey()) : game

  const store = useStorage('scores')
  const data = (await store.getItem(boardKey)) || { scores: [] }
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

  await store.setItem(boardKey, { scores: top, updatedAt: Date.now() })

  const idx = top.findIndex(s => s.user === user)

  return { ok: true, mode, best, rank: idx >= 0 ? idx + 1 : null, scores: top.slice(0, 25) }
})
