<template>
  <div class="home">
    <!-- hero -->
    <section class="home-hero">
      <div class="home-eyebrow">◈ HIVE · BBHO REWARD POOL</div>
      <h1 class="home-h1">Where great writing gets <span class="home-grad">rewarded.</span></h1>
      <p class="home-sub">A modern home for The BBH Project community — powered by Hive, fuelled by BBHO.</p>

      <div class="home-stats">
        <div class="home-stat">
          <span class="home-stat-num mono">{{ poolDisplay }}</span>
          <span class="home-stat-label">BBHO reward pool</span>
        </div>
        <div class="home-stat">
          <NuxtLink class="home-cta" :to="{ name: 'sort', params: { sort: 'trending' } }">Explore trending →</NuxtLink>
        </div>
      </div>
    </section>

    <div v-if="pending" class="home-loading">
      <loading />
    </div>

    <template v-else>
      <!-- bento grid -->
      <main class="home-grid">
        <NuxtLink
          v-for="(post, i) in bento"
          :key="i"
          :to="{ name: 'user-post', params: { user: post.author, post: post.permlink } }"
          :class="['home-card', tileClass(i)]"
        >
          <div class="home-thumb" :style="thumbStyle(post, i)">
            <div class="home-thumb-overlay" />
          </div>
          <div class="home-card-body">
            <div class="home-author">
              <img :src="`https://images.hive.blog/u/${post.author}/avatar`" alt="">
              <span>@{{ post.author }}</span>
              <span class="home-dot">·</span>
              <span>{{ ago(post.created) }}</span>
            </div>
            <h3 class="home-card-title">{{ post.title || 'Untitled' }}</h3>
            <div class="home-meta">
              <span class="home-pill mono">◈ {{ payout(post) }} <b>BBHO</b></span>
              <span class="home-mini">♥ {{ post.active_votes ? post.active_votes.length : 0 }}</span>
              <span class="home-mini">💬 {{ post.children || 0 }}</span>
            </div>
          </div>
        </NuxtLink>
      </main>

      <div class="home-more">
        <NuxtLink :to="{ name: 'sort', params: { sort: 'created' } }">See more new content →</NuxtLink>
      </div>
    </template>
  </div>
</template>

<script setup>
// Web3 Bold homepage (design D1). Same live data, bento-grid presentation.
import { useScotStore } from '~/stores/scot'
import { useTribeStore } from '~/stores/tribe'

const config = useRuntimeConfig().public
const scot = useScotStore()
const tribe = useTribeStore()

const { data, pending } = await useAsyncData('home-posts', async () => {
  const params = config.CURATED_FEED ? {} : { limit: 15 }
  const requests = [
    scot.fetchPosts({ endpoint: 'get_discussions_by_trending', params }),
    scot.fetchPosts({ endpoint: 'get_discussions_by_created' })
  ]
  if (config.CURATED_FEED) { requests.push(scot.fetchPosts({ endpoint: 'curated' })) }

  let [trending, created, curated] = await Promise.all(requests)
  trending = trending || []
  created = created || []
  if (!curated || !curated.length) { curated = trending.slice(0, 5) } else { curated = curated.slice(0, 5) }

  return { trending, created, curated }
})

// interleave curated + trending + created into one de-duped bento list
const bento = computed(() => {
  const d = data.value || {}
  const seen = new Set()
  const out = []
  for (const p of [...(d.curated || []), ...(d.trending || []), ...(d.created || [])]) {
    const key = `${p.author}/${p.permlink}`
    if (!seen.has(key)) { seen.add(key); out.push(p) }
    if (out.length >= 13) { break }
  }
  return out
})

const rewardPool = computed(() => Math.round(Number(tribe.tribe_info?.reward_pool) || 0))
const animated = ref(0)
const poolDisplay = computed(() => animated.value.toLocaleString())
onMounted(() => {
  const target = rewardPool.value || 0
  const start = performance.now()
  const tick = (t) => {
    const k = Math.min(1, (t - start) / 1400)
    animated.value = Math.round(target * (1 - Math.pow(1 - k, 3)))
    if (k < 1) { requestAnimationFrame(tick) }
  }
  requestAnimationFrame(tick)
})

const tileClass = (i) => (i === 0 ? 'tile-lg' : (i === 3 || i === 8 ? 'tile-wide' : 'tile-sm'))

const parseMeta = (post) => {
  try { return typeof post.json_metadata === 'string' ? JSON.parse(post.json_metadata) : (post.json_metadata || {}) } catch { return {} }
}
const firstImage = (post) => {
  const meta = parseMeta(post)
  if (meta.image && meta.image.length) { return meta.image[0] }
  const m = (post.body || '').match(/https?:\/\/[^\s)"']+\.(?:png|jpe?g|gif|webp)/i)
  return m ? m[0] : null
}
const gradients = [
  'linear-gradient(135deg,#e01f26,#f5b800)', 'linear-gradient(135deg,#7b2ff7,#f107a3)',
  'linear-gradient(135deg,#0acffe,#495aff)', 'linear-gradient(135deg,#f5b800,#e01f26)',
  'linear-gradient(135deg,#00f5a0,#00d9f5)'
]
const thumbStyle = (post, i) => {
  const img = firstImage(post)
  return img ? { backgroundImage: `url(https://images.hive.blog/1024x0/${img})` } : { backgroundImage: gradients[i % gradients.length] }
}
const payout = (post) => {
  const v = Number(post.estimated_payout_value ?? post.total_payout_value ?? 0)
  return v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v.toFixed(2)
}
const ago = (created) => {
  const dt = new Date(`${created}Z`).getTime()
  const s = Math.max(1, Math.round((Date.now() - dt) / 1000))
  if (s < 3600) { return Math.round(s / 60) + 'm' }
  if (s < 86400) { return Math.round(s / 3600) + 'h' }
  return Math.round(s / 86400) + 'd'
}
</script>

<style scoped>
.home { max-width: 1280px; margin: 0 auto; padding: 0 clamp(1rem, 4vw, 2rem); }

.home-hero { text-align: center; padding: clamp(2rem, 6vw, 4.5rem) 1rem 2rem; }
.home-eyebrow { font-family: 'JetBrains Mono', monospace; color: var(--w3-gold); letter-spacing: .25em; font-size: .78rem; margin-bottom: 1.1rem; }
.home-h1 { font-size: clamp(2.2rem, 5.5vw, 4.2rem); line-height: 1.03; font-weight: 700; margin: 0 0 .9rem; letter-spacing: -0.02em; }
.home-grad { background: linear-gradient(135deg, var(--w3-red), var(--w3-gold)); -webkit-background-clip: text; background-clip: text; color: transparent; }
.home-sub { color: var(--w3-muted); font-size: clamp(1rem, 2vw, 1.2rem); max-width: 600px; margin: 0 auto; }
.home-stats { display: flex; justify-content: center; align-items: center; gap: clamp(1.5rem, 5vw, 3.5rem); margin-top: 2.2rem; flex-wrap: wrap; }
.home-stat { display: flex; flex-direction: column; align-items: center; }
.home-stat-num { font-size: clamp(1.6rem, 4vw, 2.3rem); font-weight: 700; text-shadow: 0 0 24px rgba(245, 184, 0, 0.4); }
.home-stat-label { color: var(--w3-muted); font-size: .78rem; letter-spacing: .12em; text-transform: uppercase; margin-top: .25rem; }
.home-cta { display: inline-block; padding: .7rem 1.5rem; border-radius: 999px; font-weight: 600; color: #1a1206 !important; background: linear-gradient(135deg, var(--w3-gold), #ffd34d); box-shadow: 0 0 24px rgba(245, 184, 0, 0.3); text-decoration: none; }

.home-loading { text-align: center; padding: 4rem; }

.home-grid { display: grid; gap: 1rem; grid-template-columns: repeat(4, 1fr); grid-auto-rows: 215px; margin: 1.5rem 0 3rem; }
.tile-lg { grid-column: span 2; grid-row: span 2; }
.tile-wide { grid-column: span 2; }
.tile-sm { grid-column: span 1; }
@media (max-width: 820px) {
  .home-grid { grid-template-columns: repeat(2, 1fr); grid-auto-rows: 250px; }
  .tile-lg, .tile-wide { grid-column: span 2; }
  .tile-lg { grid-row: span 2; }
}

.home-card {
  position: relative; border-radius: 20px; overflow: hidden; text-decoration: none; color: inherit;
  background: var(--w3-panel); border: 1px solid var(--w3-border);
  backdrop-filter: blur(12px); display: flex; flex-direction: column;
  transition: transform .25s ease, box-shadow .25s ease, border-color .25s ease;
}
.home-card:hover { transform: translateY(-4px); border-color: rgba(245, 184, 0, 0.5); box-shadow: 0 20px 50px rgba(0,0,0,.5), 0 0 40px rgba(224, 31, 38, 0.15); }
.home-thumb { position: relative; flex: 1 1 auto; min-height: 55px; background-size: cover; background-position: center; }
.home-card-body { flex: 0 0 auto; }
.home-thumb-overlay { position: absolute; inset: 0; background: linear-gradient(180deg, transparent 25%, rgba(8,8,12,.55) 60%, rgba(8,8,12,.97)); }
.home-card-body { position: relative; padding: .85rem 1rem 1rem; background: rgba(8,8,12,.85); margin-top: -1px; }
.tile-lg .home-card-body { padding: 1.2rem 1.4rem 1.4rem; }
.home-author { display: flex; align-items: center; gap: .45rem; font-size: .8rem; color: var(--w3-muted); margin-bottom: .4rem; }
.home-author img { width: 22px; height: 22px; border-radius: 50%; }
.home-dot { opacity: .5; }
.home-card-title { font-size: 1rem; font-weight: 600; line-height: 1.25; margin: 0 0 .7rem; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.tile-lg .home-card-title { font-size: 1.6rem; -webkit-line-clamp: 3; }
.home-meta { display: flex; align-items: center; gap: .7rem; flex-wrap: wrap; }
.home-pill { font-size: .78rem; padding: .3rem .7rem; border-radius: 999px; font-weight: 700; color: var(--w3-gold); background: rgba(245, 184, 0, 0.12); border: 1px solid rgba(245, 184, 0, 0.35); box-shadow: 0 0 16px rgba(245, 184, 0, 0.18); }
.home-pill b { color: #fff; }
.home-mini { font-size: .8rem; color: #e4e4e7; font-weight: 600; text-shadow: 0 1px 3px rgba(0,0,0,.8); }

.home-more { text-align: center; padding-bottom: 3rem; }
.home-more a { font-weight: 600; text-transform: uppercase; letter-spacing: .08em; font-size: .85rem; }
</style>
