// GET /api/v1/leaderboards — community leaderboards for the tribe token.
// Four boards: Top Holders (richlist), Top Authors (recent BBHO payout), Top
// Curators (share of recent curation weight), Most Active (recent post count).
// Heavy to compute (Hive-Engine balances + SCOT posts) so it's cached in-process
// for 30 min — the first request after a cold start is the slow one.
import { defineEventHandler } from 'h3'

let cache = null
const TTL = 30 * 60 * 1000

// Richlist — total owned BBHO (liquid + stake + unstaking + delegated-out).
async function fetchHolders (config) {
  const rpc = `${config.public.SIDECHAIN_RPC}/contracts`
  const symbol = config.public.TOKEN
  const holders = []
  let offset = 0

  for (let i = 0; i < 15; i += 1) { // safety cap 15k accounts
    const res = await $fetch(rpc, {
      method: 'POST',
      body: { jsonrpc: '2.0', method: 'find', params: { contract: 'tokens', table: 'balances', query: { symbol }, limit: 1000, offset }, id: 1 },
      timeout: 15000
    })
    const batch = (res && res.result) || []
    if (!batch.length) { break }

    for (const b of batch) {
      const total = (Number(b.balance) || 0) + (Number(b.stake) || 0) + (Number(b.pendingUnstake) || 0) + (Number(b.delegationsOut) || 0)
      if (total > 0) { holders.push({ account: b.account, value: total }) }
    }

    offset += 1000
    if (batch.length < 1000) { break }
  }

  return holders.sort((a, b) => b.value - a.value).slice(0, 50).map(h => ({ account: h.account, value: +h.value.toFixed(3) }))
}

// Authors / Curators / Most-active — from a window of recent tribe posts.
async function fetchContentBoards (config) {
  const token = config.public.TOKEN
  const rpc = `${config.public.SIDECHAIN_RPC}/contracts`

  // Recent posts + the reward pool (to estimate pending BBHO from vote_rshares,
  // since freshly-created posts have total_payout_value = 0 until cashout).
  const [postsRes, poolRes] = await Promise.all([
    $fetch(`${config.public.SCOT_API}/get_discussions_by_created`, { query: { token, limit: 100 }, timeout: 15000 }).catch(() => []),
    $fetch(rpc, { method: 'POST', body: { jsonrpc: '2.0', method: 'findOne', params: { contract: 'comments', table: 'rewardPools', query: { symbol: token } }, id: 1 }, timeout: 15000 }).catch(() => null)
  ])

  const posts = Array.isArray(postsRes) ? postsRes.filter(p => p && p.main_post) : []

  const pool = poolRes && poolRes.result
  const rewardPool = pool ? Number(pool.rewardPool) : 0
  const pendingClaims = pool ? Number(pool.pendingClaims) : 0
  const exp = (pool && pool.config && Number(pool.config.postRewardCurveParameter)) || 1
  const estPayout = rshares => (pendingClaims > 0 ? (Math.pow(Math.max(0, rshares), exp) * rewardPool) / pendingClaims : 0)

  const authorPayout = {}
  const postCount = {}
  const curatorRshares = {}

  for (const p of posts) {
    const finalPayout = Number(p.total_payout_value) || 0
    authorPayout[p.author] = (authorPayout[p.author] || 0) + (finalPayout > 0 ? finalPayout : estPayout(Number(p.vote_rshares) || 0))
    postCount[p.author] = (postCount[p.author] || 0) + 1

    for (const v of (p.active_votes || [])) {
      const rsh = Number(v.rshares) || 0
      if (rsh > 0) { curatorRshares[v.voter] = (curatorRshares[v.voter] || 0) + rsh }
    }
  }

  const rank = (map, round, n = 50) => Object.entries(map)
    .map(([account, value]) => ({ account, value: +Number(value).toFixed(round) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, n)

  // Curators as % share of total recent curation weight (rshares are unit-less).
  const totalRshares = Object.values(curatorRshares).reduce((s, v) => s + v, 0) || 1
  const curators = Object.entries(curatorRshares)
    .map(([account, rsh]) => ({ account, value: +((rsh / totalRshares) * 100).toFixed(2) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 50)

  return { authors: rank(authorPayout, 3), active: rank(postCount, 0), curators }
}

export default defineEventHandler(async () => {
  const config = useRuntimeConfig()

  if (cache && (Date.now() - cache.at) < TTL) { return cache.data }

  const [holders, content] = await Promise.all([
    fetchHolders(config).catch(() => []),
    fetchContentBoards(config).catch(() => ({ authors: [], active: [], curators: [] }))
  ])

  const data = { holders, ...content, updatedAt: Date.now() }
  cache = { at: Date.now(), data }
  return data
})
