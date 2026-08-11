import { Client, PrivateKey } from '@hiveio/dhive'

// Arcade tokenomics — server-authoritative config + Hive/Hive-Engine helpers.
// The server (never the client) is the source of truth for fees, eligibility and
// payment verification. Approved defaults (owner, 2026-08-07): 0.1 BBHO ranked
// entry, 1 free/day (+1 for stakers), weekly top-10 top-heavy payout, 10% burn,
// pot + payouts via BBHBot. Winners are shown in-app (no auto-post → no
// Hivewatchers risk).
export const ARCADE = {
  game: 'bee-invaders',
  symbol: 'BBHO',
  precision: 8,
  entryFee: 0.1,
  burnPct: 0.10,
  potAccount: 'bbhbot',
  freeEntriesPerDay: 1,
  stakerPerkMinStake: 100, // >= this staked BBHO → +1 free ranked entry/day
  continueFee: 0.05,
  maxContinues: 1,
  payoutTop: 10,
  // Top-heavy split of the (post-burn) weekly pot; sums to 1.0.
  payoutSplit: [0.30, 0.20, 0.15, 0.10, 0.08, 0.06, 0.04, 0.03, 0.02, 0.02],
  minPot: 10, // below this the pot rolls over to next week
  minAccountAgeDays: 30, // prize eligibility
  minStakeEligible: 10 // prize eligibility (staked BBHO)
}

const SIDECHAIN_RPC = 'https://enginerpc.com'
const HISTORY_API = 'https://history.hive-engine.com'
const HIVE_NODES = ['https://api.hive.blog', 'https://api.deathwing.me', 'https://api.openhive.network']

// Broadcast one or more Hive-Engine token operations from the pot account (BBHBot)
// in a single custom_json, signed with its active key. Used by the weekly payout.
export async function broadcastPotOps (ops, activeKey) {
  const client = new Client(HIVE_NODES, { timeout: 8000, failoverThreshold: 1 })
  const json = JSON.stringify(ops.length === 1 ? ops[0] : ops)
  return client.broadcast.json({
    required_auths: [ARCADE.potAccount],
    required_posting_auths: [],
    id: 'ssc-mainnet-hive',
    json
  }, PrivateKey.fromString(activeKey))
}

// A Hive-Engine token transfer op (to 'null' burns).
export function transferOp (to, quantity, memo) {
  return {
    contractName: 'tokens',
    contractAction: 'transfer',
    contractPayload: { symbol: ARCADE.symbol, to, quantity, memo }
  }
}

// Public-safe subset for the client to display / build the entry transfer.
export function arcadePublicConfig () {
  return {
    game: ARCADE.game,
    symbol: ARCADE.symbol,
    entryFee: ARCADE.entryFee,
    burnPct: ARCADE.burnPct,
    potAccount: ARCADE.potAccount,
    freeEntriesPerDay: ARCADE.freeEntriesPerDay,
    stakerPerkMinStake: ARCADE.stakerPerkMinStake,
    continueFee: ARCADE.continueFee,
    maxContinues: ARCADE.maxContinues,
    payoutTop: ARCADE.payoutTop,
    minPot: ARCADE.minPot,
    minAccountAgeDays: ARCADE.minAccountAgeDays,
    minStakeEligible: ARCADE.minStakeEligible
  }
}

// UTC day / ISO-week keys for tracking free entries and weekly leaderboards.
export function dayKey (ts = Date.now()) {
  return new Date(ts).toISOString().slice(0, 10) // YYYY-MM-DD
}

export function weekKey (ts = Date.now()) {
  const d = new Date(ts)
  d.setUTCHours(0, 0, 0, 0)
  // Thursday-based ISO week number
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const week = Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

// Hive-Engine BBHO balance { balance, stake } for an account (0/0 on any error).
export async function getBbhoBalance (account) {
  try {
    const res = await $fetch(`${SIDECHAIN_RPC}/contracts`, {
      method: 'POST',
      body: { jsonrpc: '2.0', id: 1, method: 'find', params: { contract: 'tokens', table: 'balances', query: { account, symbol: ARCADE.symbol } } }
    })
    const row = res && res.result && res.result[0]
    return { balance: Number(row?.balance || 0), stake: Number(row?.stake || 0) }
  } catch {
    return { balance: 0, stake: 0 }
  }
}

// Account age in days from the Hive account's creation date (0 on error → treated
// as too-new / ineligible by callers).
export async function getAccountAgeDays (account) {
  for (const node of HIVE_NODES) {
    try {
      const res = await $fetch(node, {
        method: 'POST',
        body: { jsonrpc: '2.0', id: 1, method: 'condenser_api.get_accounts', params: [[account]] }
      })
      const created = res && res.result && res.result[0] && res.result[0].created
      if (created) {
        const ageMs = Date.now() - new Date(created + 'Z').getTime()
        return ageMs / 86400000
      }
    } catch { /* try next node */ }
  }
  return 0
}

// Storage keys. Kept flat (underscores, not ':') because the fsLite driver maps
// ':' to directory separators — a `game:ranked:week` key would need `game/` as a
// dir, which collides with the casual board stored under the flat `game` file.
export function rankedBoardKey (game, week) { return `${game}_ranked_${week}` }
export function winnersKey (game, weekOrLatest) { return `${game}_${weekOrLatest}` }

// ISO-week key for the week before `ts` (what a Monday payout run pays out).
export function prevWeekKey (ts = Date.now()) {
  return weekKey(ts - 4 * 86400000) // 4 days back always lands in the prior week
}

// BBHO quantity string at the token's precision (floored, never over-pays).
export function formatQty (n) {
  const f = Math.floor(Number(n) * 1e8) / 1e8
  return f.toFixed(ARCADE.precision)
}

// Prize eligibility: account old enough AND holds enough staked BBHO.
export async function isEligible (account) {
  const [ageDays, bal] = await Promise.all([getAccountAgeDays(account), getBbhoBalance(account)])
  return ageDays >= ARCADE.minAccountAgeDays && bal.stake >= ARCADE.minStakeEligible
}

// Sum ranked entry payments (incoming BBHO to the pot, memo 'bva:*') received after
// `sinceSec`. Pages back through the pot account's Hive-Engine history.
export async function sumRankedEntriesSince (sinceSec) {
  let total = 0
  let count = 0
  for (let page = 0; page < 20; page++) {
    let rows
    try {
      rows = await $fetch(`${HISTORY_API}/accountHistory`, {
        params: { account: ARCADE.potAccount, symbol: ARCADE.symbol, limit: 100, offset: page * 100 }
      })
    } catch { break }
    if (!Array.isArray(rows) || rows.length === 0) { break }

    let reachedOld = false
    for (const r of rows) {
      if (!r || r.operation !== 'tokens_transfer') { continue }
      const ts = Number(r.timestamp || 0)
      if (ts <= sinceSec) { reachedOld = true; continue }
      if (r.to === ARCADE.potAccount && typeof r.memo === 'string' && r.memo.startsWith('bva:')) {
        total += Number(r.quantity) || 0
        count++
      }
    }
    if (reachedOld || rows.length < 100) { break }
  }
  return { total, count }
}

// Verify a ranked-entry payment landed: an incoming BBHO transfer to the pot from
// `user`, >= amount, memo matching, at/after `sinceSec` (unix seconds). Scans the
// pot account's recent Hive-Engine history.
export async function verifyEntryPayment ({ user, memo, amount, sinceSec }) {
  try {
    const rows = await $fetch(`${HISTORY_API}/accountHistory`, {
      params: { account: ARCADE.potAccount, symbol: ARCADE.symbol, limit: 100 }
    })
    if (!Array.isArray(rows)) { return false }
    return rows.some(r =>
      r && r.operation === 'tokens_transfer' &&
      r.from === user &&
      r.to === ARCADE.potAccount &&
      Number(r.quantity) >= amount - 1e-9 &&
      (!memo || r.memo === memo) &&
      Number(r.timestamp || 0) >= sinceSec - 300
    )
  } catch {
    return false
  }
}
