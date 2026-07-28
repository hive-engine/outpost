// Hive-Engine (SCOT) token provider.
//
// Wraps the existing $sidechain / SCOT calls behind the common `tokenProvider`
// interface (see plugins/token-provider.js). This is the DEFAULT backend and is
// behaviour-preserving — it just normalises Hive-Engine's field names/shapes to
// the neutral surface the UI consumes, so a Magi (VSC) provider can be dropped in
// later with one config flag (TOKEN_BACKEND) and no UI changes.
//
// `sidechain` is injected (nuxtApp.$sidechain) so the provider stays free of any
// plugin-init ordering assumptions and is trivially unit-testable.
export function createHiveEngineProvider ({ sidechain }) {
  const num = v => Number(v) || 0

  return {
    backend: 'hive-engine',

    // Market metrics → { price, lastDayPrice, changePct, volume }.
    async getMarketMetrics (symbol) {
      const m = await sidechain.getMetrics(symbol)
      if (!m) { return null }
      const price = num(m.lastPrice)
      const lastDayPrice = num(m.lastDayPrice) || price
      const changePct = lastDayPrice > 0 ? ((price - lastDayPrice) / lastDayPrice) * 100 : 0
      return { price, lastDayPrice, changePct, volume: num(m.volume), raw: m }
    },

    // Token metadata/supply → { name, supply, circulatingSupply, maxSupply }.
    async getTokenInfo (symbol) {
      const r = await sidechain.getTokens({ symbol })
      const t = Array.isArray(r) ? r[0] : r
      if (!t) { return null }
      let name = t.name
      try { name = JSON.parse(t.metadata || '{}').name || name } catch { /* keep t.name */ }
      return {
        name: name || null,
        supply: num(t.supply),
        circulatingSupply: num(t.circulatingSupply),
        maxSupply: num(t.maxSupply),
        raw: t
      }
    },

    // SCOT reward pool → { rewardPool, pendingClaims, config }.
    async getRewardPool (symbol) {
      const p = await sidechain.getSMTRewardPool(symbol)
      if (!p) { return null }
      return { rewardPool: num(p.rewardPool), pendingClaims: num(p.pendingClaims), config: p.config || null, raw: p }
    },

    // Account balance → { liquid, stake, delegationsIn, delegationsOut }.
    async getBalance (account, symbol) {
      const b = await sidechain.getBalance(account, symbol)
      if (!b) { return { liquid: 0, stake: 0, delegationsIn: 0, delegationsOut: 0, raw: null } }
      return {
        liquid: num(b.balance),
        stake: num(b.stake),
        delegationsIn: num(b.delegationsIn),
        delegationsOut: num(b.delegationsOut),
        raw: b
      }
    }
  }
}
