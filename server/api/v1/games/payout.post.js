// POST /api/v1/games/payout — run the weekly Bee Invaders prize payout.
// Protected by a shared admin token (header `x-arcade-admin`); triggered by a
// systemd timer via curl, NOT by end users. No-ops safely until both
// ARCADE_ADMIN_TOKEN and BBHBOT_ACTIVE_KEY are set in the (gitignored) .env.
//
// Flow: pot = ranked entries received since the last payout; burn burnPct; split
// the rest top-heavy across the top-N *eligible* players of the target week's
// ranked board; broadcast all transfers from BBHBot in one custom_json; record
// winners for in-app display. Supports { dryRun:true } and { week:'YYYY-Www' }.
import { defineEventHandler, readBody, getHeader, createError } from 'h3'
import {
  ARCADE, prevWeekKey, formatQty, isEligible, sumRankedEntriesSince,
  broadcastPotOps, transferOp, rankedBoardKey, winnersKey
} from '../../../utils/arcade'

export default defineEventHandler(async (event) => {
  const rc = useRuntimeConfig()
  const adminToken = rc.arcadeAdminToken
  const activeKey = rc.bbhbotActiveKey

  // Admin gate — must be configured AND match. Absent config = disabled.
  const presented = getHeader(event, 'x-arcade-admin') || ''
  if (!adminToken || presented !== adminToken) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const body = await readBody(event).catch(() => ({}))
  const dryRun = !!body.dryRun
  const week = String(body.week || prevWeekKey())
  const game = 'bee-invaders'

  if (!activeKey && !dryRun) {
    return { ok: false, reason: 'BBHBOT_ACTIVE_KEY not configured — payouts disabled' }
  }

  const scores = useStorage('scores')
  const winnersStore = useStorage('winners')

  // Pot = ranked entries since the last payout (natural rollover if we skip).
  // Dry-run may override the pot and use the casual board to preview the maths.
  const meta = (await scores.getItem('meta_payout')) || {}
  const sinceSec = meta.lastPayoutAt ? Math.floor(meta.lastPayoutAt / 1000) : Math.floor((Date.now() - 8 * 86400000) / 1000)

  let pot, entryCount
  if (dryRun && body.pot != null) {
    pot = Number(body.pot)
    entryCount = -1 // simulated
  } else {
    const r = await sumRankedEntriesSince(sinceSec)
    pot = r.total
    entryCount = r.count
  }

  if (pot < ARCADE.minPot) {
    return { ok: true, skipped: true, reason: `pot ${pot} below minimum ${ARCADE.minPot} — rolling over`, pot, week }
  }

  // Target week's ranked board, best-first (dry-run may preview from casual).
  const boardKey = (dryRun && body.useCasualBoard) ? game : rankedBoardKey(game, week)
  const boardData = await scores.getItem(boardKey)
  const board = (boardData && Array.isArray(boardData.scores)) ? boardData.scores : []
  if (board.length === 0) {
    return { ok: true, skipped: true, reason: 'no ranked scores for target week', pot, week }
  }

  // Walk the board top-down, keeping the first payoutTop *eligible* players.
  const winners = []
  for (const row of board) {
    if (winners.length >= ARCADE.payoutTop) { break }
    if (await isEligible(row.user)) { winners.push({ user: row.user, score: row.score }) }
  }
  if (winners.length === 0) {
    return { ok: true, skipped: true, reason: 'no eligible players (account age / stake gate)', pot, week }
  }

  // Burn, then split the remainder over the present winners (renormalised so the
  // whole post-burn pot is paid even when fewer than payoutTop are eligible).
  const burnAmount = pot * ARCADE.burnPct
  const payable = pot - burnAmount
  const usedSplit = ARCADE.payoutSplit.slice(0, winners.length)
  const splitSum = usedSplit.reduce((a, b) => a + b, 0)

  winners.forEach((w, i) => {
    w.rank = i + 1
    w.amount = formatQty(payable * (usedSplit[i] / splitSum))
  })

  const ops = []
  if (burnAmount > 0) { ops.push(transferOp('null', formatQty(burnAmount), `Bee Invaders ${week} — 10% burn`)) }
  for (const w of winners) {
    if (Number(w.amount) > 0) { ops.push(transferOp(w.user, w.amount, `🐝 Bee Invaders ${week} prize — rank #${w.rank}`)) }
  }

  if (dryRun) {
    return { ok: true, dryRun: true, week, pot, entryCount, burn: formatQty(burnAmount), winners, ops }
  }

  let txId = null
  try {
    const res = await broadcastPotOps(ops, activeKey)
    txId = res && res.id ? res.id : null
  } catch (e) {
    return { ok: false, reason: `broadcast failed: ${e.message}`, week, pot, winners }
  }

  const record = { game, week, pot, burned: formatQty(burnAmount), winners, entryCount, paidAt: Date.now(), txId }
  await winnersStore.setItem(winnersKey(game, week), record)
  await winnersStore.setItem(winnersKey(game, 'latest'), record)
  await scores.setItem('meta_payout', { lastPayoutAt: Date.now(), lastWeek: week })

  return { ok: true, week, pot, burned: record.burned, txId, winners }
})
