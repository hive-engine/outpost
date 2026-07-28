<template>
  <aside class="chats-aside">
    <!-- BBHO token widget -->
    <div class="aside-card token-card">
      <div class="token-head">
        <div class="token-id">
          <span class="token-sym">${{ config.TOKEN }}</span>
          <span class="token-name">{{ bbho?.name || 'BBH Outpost' }}</span>
        </div>
        <a class="token-trade" :href="`https://tribaldex.com/trade/${config.TOKEN}`" target="_blank" rel="noopener">
          Trade <fa-icon icon="external-link-alt" />
        </a>
      </div>

      <client-only>
        <div v-if="bbho" class="token-body">
          <div class="token-price-row">
            <div>
              <div class="token-price mono">{{ fmtPrice(bbho.price) }} <span class="token-unit">HIVE</span></div>
              <div v-if="bbho.usd != null" class="token-usd mono">≈ ${{ fmtUsd(bbho.usd) }}</div>
            </div>
            <div class="token-change" :class="bbho.changePct >= 0 ? 'up' : 'down'">
              <fa-icon :icon="bbho.changePct >= 0 ? 'long-arrow-alt-up' : 'long-arrow-alt-down'" />
              {{ Math.abs(bbho.changePct).toFixed(2) }}%
            </div>
          </div>

          <div class="token-grid">
            <div class="token-stat">
              <div class="live-label">24h Vol</div>
              <div class="token-stat-val mono">{{ fmtNum(bbho.volume) }} <span class="token-unit">HIVE</span></div>
            </div>
            <div class="token-stat">
              <div class="live-label">Reward pool</div>
              <div class="token-stat-val mono">{{ fmtCompact(bbho.rewardPool) }}</div>
            </div>
          </div>
        </div>
        <div v-else class="token-loading mono">loading {{ config.TOKEN }}…</div>
        <template #fallback>
          <div class="token-loading mono">loading {{ config.TOKEN }}…</div>
        </template>
      </client-only>
    </div>

    <!-- live Hive widget -->
    <div class="aside-card live-card">
      <div class="live-head">
        <span class="live-dot" /> Live on Hive
      </div>

      <client-only>
        <div class="live-grid">
          <div class="live-stat">
            <div class="live-label">Block</div>
            <div class="live-value mono">{{ blockDisplay }}</div>
          </div>
          <div class="live-stat">
            <div class="live-label">HBD APR</div>
            <div class="live-value mono">{{ apr }}</div>
          </div>
        </div>
        <template #fallback>
          <div class="live-grid">
            <div class="live-stat"><div class="live-label">Block</div><div class="live-value mono">—</div></div>
            <div class="live-stat"><div class="live-label">HBD APR</div><div class="live-value mono">—</div></div>
          </div>
        </template>
      </client-only>
    </div>

    <!-- trending tags -->
    <div v-if="tags.length" class="aside-card">
      <div class="aside-title">Trending topics</div>
      <div class="aside-tags">
        <nuxt-link
          v-for="tag of tags"
          :key="tag"
          class="aside-tag"
          :to="{ name: 'sort-tag', params: { sort: 'trending', tag } }"
        >#{{ tag }}</nuxt-link>
      </div>
    </div>

    <!-- CTA -->
    <div v-if="!auth.loggedIn" class="aside-card cta-card">
      <div class="cta-title">Join the conversation</div>
      <p class="cta-text">Log in with Hive Keychain to post Chats, upvote and reply.</p>
      <nuxt-link class="cta-btn" :to="{ name: 'login' }">Log in</nuxt-link>
    </div>

    <div class="aside-foot">
      Chats run on the Hive blockchain — your posts are yours, forever.
    </div>
  </aside>
</template>

<script setup>
// Right rail for /chats: a live Hive network widget (head block ticking + HBD
// APR, client-only to avoid hydration drift) and trending topic chips.
import { useAuthStore } from '~/stores/auth'
import { useScotStore } from '~/stores/scot'

const config = useRuntimeConfig().public
const auth = useAuthStore()
const scot = useScotStore()
const { $chain, $token } = useNuxtApp()

const block = ref(0)
const aprRaw = ref(null)
const bbho = ref(null)
let timer = null
let tokenTimer = null

const blockDisplay = computed(() => (block.value ? block.value.toLocaleString() : '—'))
const apr = computed(() => (aprRaw.value != null ? `${(aprRaw.value / 100).toFixed(2)}%` : '—'))
const tags = computed(() => (scot.trending_tags || []).slice(0, 12))

// --- formatters ---
const fmtPrice = v => Number(v).toFixed(4)
const fmtUsd = v => (Number(v) < 0.01 ? Number(v).toFixed(5) : Number(v).toFixed(4))
const fmtNum = v => Number(v).toLocaleString('en-US', { maximumFractionDigits: 1 })
const fmtCompact = (v) => {
  const n = Number(v)
  if (n >= 1e6) { return `${(n / 1e6).toFixed(2)}M` }
  if (n >= 1e3) { return `${(n / 1e3).toFixed(1)}K` }
  return n.toFixed(0)
}

async function refresh () {
  try {
    const props = await $chain.getClient().database.getDynamicGlobalProperties()
    block.value = props.head_block_number
    aprRaw.value = props.hbd_interest_rate
  } catch {
    // leave last-known values
  }
}

async function fetchToken () {
  try {
    // Read through the token-backend abstraction ($token) rather than Hive-Engine
    // directly — so this ticker works unchanged when TOKEN_BACKEND flips to Magi.
    const [metrics, info, pool] = await Promise.all([
      $token.getMarketMetrics(config.TOKEN),
      $token.getTokenInfo(config.TOKEN).catch(() => null),
      $token.getRewardPool(config.TOKEN).catch(() => null)
    ])

    if (!metrics) { return }

    const price = metrics.price

    // best-effort USD (HIVE/USD via coingecko; silently skipped on failure)
    let usd = null
    try {
      const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=hive&vs_currencies=usd')
      const j = await res.json()
      if (j?.hive?.usd) { usd = price * j.hive.usd }
    } catch { /* no USD */ }

    bbho.value = {
      name: info?.name || 'BBH Outpost',
      price,
      changePct: metrics.changePct,
      volume: metrics.volume,
      rewardPool: pool?.rewardPool || 0,
      usd
    }
  } catch {
    // leave last-known values
  }
}

onMounted(() => {
  refresh()
  fetchToken()
  timer = setInterval(refresh, 3000)
  tokenTimer = setInterval(fetchToken, 60000)
  if (!scot.trending_tags || scot.trending_tags.length === 0) { scot.fetchTrendingTags() }
})

onBeforeUnmount(() => {
  if (timer) { clearInterval(timer) }
  if (tokenTimer) { clearInterval(tokenTimer) }
})
</script>

<style scoped>
.chats-aside {
  position: sticky;
  top: 84px;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.aside-card {
  background: var(--w3-panel);
  border: 1px solid var(--w3-border);
  border-radius: 16px;
  padding: 1.1rem 1.2rem;
  backdrop-filter: blur(10px);
}

/* BBHO token card */
.token-card {
  background:
    radial-gradient(130% 120% at 0% 0%, rgba(245, 184, 0, .14), transparent 55%),
    radial-gradient(130% 120% at 100% 100%, rgba(224, 31, 38, .10), transparent 55%),
    var(--w3-panel);
  border-color: rgba(245, 184, 0, .28);
}
.token-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: .8rem;
}
.token-id { display: flex; flex-direction: column; }
.token-sym {
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 800;
  font-size: 1.15rem;
  background: linear-gradient(135deg, var(--w3-gold), #ffd34d);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  line-height: 1.1;
}
.token-name { font-size: .74rem; color: var(--w3-muted); }
.token-trade {
  font-size: .76rem;
  font-weight: 700;
  color: var(--w3-gold);
  text-decoration: none;
  white-space: nowrap;
  padding: .28rem .6rem;
  border-radius: 999px;
  border: 1px solid rgba(245, 184, 0, .35);
  transition: all .15s ease;
}
.token-trade:hover { background: var(--w3-gold); color: #1a1206; }

.token-price-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: .5rem;
}
.token-price { font-size: 1.35rem; font-weight: 800; color: var(--w3-text); line-height: 1.1; }
.token-unit { font-size: .7rem; font-weight: 600; color: var(--w3-muted); }
.token-usd { font-size: .8rem; color: var(--w3-muted); margin-top: .15rem; }
.token-change {
  display: inline-flex;
  align-items: center;
  gap: .2rem;
  font-weight: 800;
  font-size: .92rem;
  padding: .2rem .55rem;
  border-radius: 999px;
}
.token-change.up { color: #2ecc71; background: rgba(46, 204, 113, .12); }
.token-change.down { color: #ff5964; background: rgba(255, 89, 100, .12); }

.token-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: .7rem;
  margin-top: .9rem;
  padding-top: .85rem;
  border-top: 1px solid var(--w3-border);
}
.token-stat-val { font-size: .98rem; font-weight: 700; color: var(--w3-text); margin-top: .15rem; }
.token-loading { color: var(--w3-muted); font-size: .85rem; }

.live-card {
  background:
    radial-gradient(120% 100% at 0% 0%, rgba(245, 184, 0, .08), transparent 60%),
    var(--w3-panel);
}
.live-head {
  display: flex;
  align-items: center;
  gap: .5rem;
  font-weight: 700;
  font-size: .8rem;
  letter-spacing: .06em;
  text-transform: uppercase;
  color: var(--w3-muted);
  margin-bottom: .9rem;
}
.live-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  background: #2ecc71;
  box-shadow: 0 0 0 0 rgba(46, 204, 113, .6);
  animation: livePulse 1.8s infinite;
}
@keyframes livePulse {
  0% { box-shadow: 0 0 0 0 rgba(46, 204, 113, .5); }
  70% { box-shadow: 0 0 0 7px rgba(46, 204, 113, 0); }
  100% { box-shadow: 0 0 0 0 rgba(46, 204, 113, 0); }
}
.live-grid { display: grid; grid-template-columns: 1fr 1fr; gap: .8rem; }
.live-label { font-size: .72rem; color: var(--w3-muted); text-transform: uppercase; letter-spacing: .04em; }
.live-value { font-size: 1.15rem; font-weight: 700; color: var(--w3-text); margin-top: .15rem; }

.aside-title {
  font-weight: 700;
  font-size: 1.05rem;
  color: var(--w3-text);
  margin-bottom: .8rem;
}
.aside-tags { display: flex; flex-wrap: wrap; gap: .45rem; }
.aside-tag {
  font-size: .82rem;
  font-weight: 600;
  color: var(--w3-muted);
  text-decoration: none;
  padding: .3rem .7rem;
  border-radius: 999px;
  background: var(--w3-panel-2);
  border: 1px solid var(--w3-border);
  transition: all .15s ease;
}
.aside-tag:hover {
  color: #1a1206;
  background: linear-gradient(135deg, var(--w3-gold), #ffd34d);
  border-color: transparent;
}

.cta-card {
  background:
    radial-gradient(120% 100% at 100% 0%, rgba(224, 31, 38, .12), transparent 60%),
    var(--w3-panel);
}
.cta-title { font-weight: 700; font-size: 1.1rem; color: var(--w3-text); }
.cta-text { color: var(--w3-muted); font-size: .88rem; margin: .4rem 0 .9rem; }
.cta-btn {
  display: inline-block;
  padding: .5rem 1.3rem;
  border-radius: 999px;
  font-weight: 700;
  text-decoration: none;
  color: #1a1206;
  background: linear-gradient(135deg, var(--w3-gold), #ffd34d);
  transition: transform .15s ease;
}
.cta-btn:hover { transform: translateY(-1px); }

.aside-foot {
  font-size: .78rem;
  color: var(--w3-muted);
  line-height: 1.5;
  padding: 0 .3rem;
}
</style>
