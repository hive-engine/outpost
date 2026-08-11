// POST /api/v1/games/session — open a server-authoritative game run.
// Body: { game, mode: 'free' | 'ranked' }. Returns { sessionId, seed, startedAt,
// mode, paid, ... }.
//
// Free/casual runs open instantly. Ranked runs first spend a free daily entry
// (1/day, +1 for stakers >= stakerPerkMinStake); once those are used the response
// carries payment instructions (fee, pot account, memo) and the session stays
// unpaid until /session/confirm (or the score submit) verifies the BBHO transfer.
import { defineEventHandler, readBody, createError } from 'h3'
import { getAppSession } from '../../../utils/session'
import { ARCADE, dayKey, getBbhoBalance } from '../../../utils/arcade'

const KNOWN_GAMES = ['bee-invaders']

export default defineEventHandler(async (event) => {
  const appSession = await getAppSession(event)
  const user = appSession.data && appSession.data.user

  if (!user) { throw createError({ statusCode: 401, statusMessage: 'Unauthorized' }) }

  const body = await readBody(event).catch(() => ({}))
  const game = String(body.game || '')
  if (!KNOWN_GAMES.includes(game)) { throw createError({ statusCode: 400, statusMessage: 'Unknown game' }) }
  const mode = body.mode === 'ranked' ? 'ranked' : 'free'

  const startedAt = Date.now()
  const seed = (Math.floor(Math.random() * 0x7fffffff)) >>> 0
  const rand = Math.floor(Math.random() * 0x7fffffff).toString(36)
  const sessionId = `${user}:${game}:${startedAt.toString(36)}:${rand}`

  const store = useStorage('gamesessions')
  const base = { user, game, mode, seed, startedAt, used: false }

  if (mode === 'free') {
    await store.setItem(sessionId, { ...base, paid: true })
    return { sessionId, seed, startedAt, mode, paid: true }
  }

  // Ranked: spend a free daily entry if any remain (staker perk grants +1).
  const { stake } = await getBbhoBalance(user)
  const allowance = ARCADE.freeEntriesPerDay + (stake >= ARCADE.stakerPerkMinStake ? 1 : 0)
  const usedKey = `free:${game}:${user}:${dayKey(startedAt)}`
  const usedFree = Number((await store.getItem(usedKey)) || 0)

  if (usedFree < allowance) {
    await store.setItem(usedKey, usedFree + 1)
    await store.setItem(sessionId, { ...base, paid: true, freeEntry: true })
    return { sessionId, seed, startedAt, mode, paid: true, free: true, freeLeft: allowance - usedFree - 1 }
  }

  // Out of free entries → require payment.
  const memo = `bva:${sessionId}`
  await store.setItem(sessionId, { ...base, paid: false, memo })
  return {
    sessionId,
    seed,
    startedAt,
    mode,
    paid: false,
    requiresPayment: true,
    fee: ARCADE.entryFee,
    potAccount: ARCADE.potAccount,
    symbol: ARCADE.symbol,
    memo
  }
})
