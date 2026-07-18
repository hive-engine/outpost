<template>
  <div class="w3">
    <div class="w3-bg" />

    <!-- top bar -->
    <nav class="w3-nav">
      <div class="w3-brand">
        <img src="/logo.png" alt="BBH">
        <span>THE BBH PROJECT</span>
      </div>
      <div class="w3-nav-right">
        <a class="w3-navlink" href="/">← back to live site</a>
        <button class="w3-connect">Connect</button>
      </div>
    </nav>

    <!-- hero -->
    <header class="w3-hero">
      <div class="w3-eyebrow">◈ HIVE · BBHO REWARD POOL</div>
      <h1 class="w3-h1">Where great writing gets <span class="w3-grad">rewarded.</span></h1>
      <p class="w3-sub">A modern home for The BBH Project community — powered by Hive, fuelled by BBHO.</p>

      <div class="w3-stats">
        <div class="w3-stat">
          <span class="w3-stat-num mono">{{ poolDisplay }}</span>
          <span class="w3-stat-label">BBHO reward pool</span>
        </div>
        <div class="w3-stat">
          <span class="w3-stat-num mono">{{ postCount }}</span>
          <span class="w3-stat-label">posts loaded</span>
        </div>
        <div class="w3-stat">
          <span class="w3-stat-num mono">{{ voteCount }}</span>
          <span class="w3-stat-label">votes on screen</span>
        </div>
      </div>
    </header>

    <!-- bento grid -->
    <main class="w3-grid">
      <a
        v-for="(post, i) in posts"
        :key="i"
        :href="`/@${post.author}/${post.permlink}`"
        :class="['w3-card', tileClass(i)]"
      >
        <div class="w3-thumb" :style="thumbStyle(post, i)">
          <div class="w3-thumb-overlay" />
        </div>

        <div class="w3-card-body">
          <div class="w3-author">
            <img :src="`https://images.hive.blog/u/${post.author}/avatar`" alt="">
            <span>@{{ post.author }}</span>
            <span class="w3-dot">·</span>
            <span class="w3-time">{{ ago(post.created) }}</span>
          </div>

          <h3 class="w3-card-title">{{ post.title || 'Untitled' }}</h3>

          <div class="w3-meta">
            <span class="w3-pill mono">◈ {{ payout(post) }} <b>BBHO</b></span>
            <span class="w3-stat-mini">♥ {{ post.active_votes ? post.active_votes.length : 0 }}</span>
            <span class="w3-stat-mini">💬 {{ post.children || 0 }}</span>
          </div>
        </div>
      </a>
    </main>

    <footer class="w3-foot">
      Prototype · Web3 Bold concept · real BBHO data ·
      <a href="/">the current site is unchanged</a>
    </footer>
  </div>
</template>

<script setup>
// Web3 Bold redesign PROTOTYPE — standalone showcase (layout:false), real data.
import { useScotStore } from '~/stores/scot'
import { useTribeStore } from '~/stores/tribe'

definePageMeta({ layout: false })

useHead({
  title: 'BBH · Web3 Bold preview',
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&display=swap' }
  ]
})

const scot = useScotStore()
const tribe = useTribeStore()

const { data: posts } = await useAsyncData('w3-posts', async () => {
  const p = await scot.fetchPosts({ endpoint: 'get_discussions_by_created', params: { limit: 9 } })
  return Array.isArray(p) ? p : []
}, { default: () => [] })

const postCount = computed(() => posts.value.length)
const voteCount = computed(() => posts.value.reduce((a, p) => a + (p.active_votes ? p.active_votes.length : 0), 0))

// animated reward-pool counter
const rewardPool = computed(() => Math.round(Number(tribe.tribe_info?.reward_pool) || 0))
const animated = ref(0)
const poolDisplay = computed(() => animated.value.toLocaleString())

onMounted(() => {
  const target = rewardPool.value || 0
  const start = performance.now()
  const dur = 1400
  const tick = (t) => {
    const k = Math.min(1, (t - start) / dur)
    animated.value = Math.round(target * (1 - Math.pow(1 - k, 3)))
    if (k < 1) { requestAnimationFrame(tick) }
  }
  requestAnimationFrame(tick)
})

// varied bento tile sizes
const tileClass = (i) => {
  if (i === 0) { return 'tile-lg' }
  if (i === 3 || i === 6) { return 'tile-wide' }
  return 'tile-sm'
}

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
  'linear-gradient(135deg,#e01f26,#f5b800)',
  'linear-gradient(135deg,#7b2ff7,#f107a3)',
  'linear-gradient(135deg,#0acffe,#495aff)',
  'linear-gradient(135deg,#f5b800,#e01f26)',
  'linear-gradient(135deg,#00f5a0,#00d9f5)'
]

const thumbStyle = (post, i) => {
  const img = firstImage(post)
  if (img) {
    return { backgroundImage: `url(https://images.hive.blog/1024x0/${img})` }
  }
  return { backgroundImage: gradients[i % gradients.length] }
}

const payout = (post) => {
  const v = Number(post.estimated_payout_value ?? post.total_payout_value ?? 0)
  return v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v.toFixed(2)
}

const ago = (created) => {
  const d = new Date(`${created}Z`).getTime()
  const s = Math.max(1, Math.round((Date.now() - d) / 1000))
  if (s < 3600) { return Math.round(s / 60) + 'm' }
  if (s < 86400) { return Math.round(s / 3600) + 'h' }
  return Math.round(s / 86400) + 'd'
}
</script>

<style scoped>
.w3 {
  --red: #e01f26;
  --gold: #f5b800;
  --bg: #08080c;
  --panel: rgba(255, 255, 255, 0.04);
  --border: rgba(255, 255, 255, 0.09);
  min-height: 100vh;
  background: var(--bg);
  color: #f4f4f5;
  font-family: 'Space Grotesk', system-ui, sans-serif;
  position: relative;
  overflow-x: hidden;
}
.mono { font-family: 'JetBrains Mono', monospace; }

/* animated aurora background */
.w3-bg {
  position: fixed; inset: 0; z-index: 0; pointer-events: none;
  background:
    radial-gradient(60vw 60vw at 15% -10%, rgba(224, 31, 38, 0.28), transparent 60%),
    radial-gradient(50vw 50vw at 90% 0%, rgba(245, 184, 0, 0.22), transparent 55%),
    radial-gradient(40vw 40vw at 60% 40%, rgba(123, 47, 247, 0.18), transparent 60%);
  filter: blur(20px);
  animation: drift 16s ease-in-out infinite alternate;
}
@keyframes drift { from { transform: translate3d(0,0,0) scale(1); } to { transform: translate3d(-3%,2%,0) scale(1.1); } }

.w3-nav, .w3-hero, .w3-grid, .w3-foot { position: relative; z-index: 1; }

.w3-nav {
  display: flex; align-items: center; justify-content: space-between;
  padding: 1.1rem clamp(1rem, 4vw, 3rem);
}
.w3-brand { display: flex; align-items: center; gap: .7rem; font-weight: 700; letter-spacing: .04em; }
.w3-brand img { width: 40px; height: 40px; }
.w3-nav-right { display: flex; align-items: center; gap: 1.2rem; }
.w3-navlink { color: #a1a1aa; text-decoration: none; font-size: .9rem; }
.w3-navlink:hover { color: #fff; }
.w3-connect {
  border: 0; padding: .55rem 1.3rem; border-radius: 999px; font-weight: 600; cursor: pointer;
  color: #1a1206; background: linear-gradient(135deg, var(--gold), #ffd34d);
  box-shadow: 0 0 24px rgba(245, 184, 0, 0.35);
}

.w3-hero { text-align: center; padding: clamp(2rem, 7vw, 5rem) 1.5rem 2.5rem; max-width: 1000px; margin: 0 auto; }
.w3-eyebrow { font-family: 'JetBrains Mono', monospace; color: var(--gold); letter-spacing: .25em; font-size: .8rem; margin-bottom: 1.2rem; }
.w3-h1 { font-size: clamp(2.4rem, 6vw, 4.6rem); line-height: 1.02; font-weight: 700; margin: 0 0 1rem; letter-spacing: -0.02em; }
.w3-grad { background: linear-gradient(135deg, var(--red), var(--gold)); -webkit-background-clip: text; background-clip: text; color: transparent; }
.w3-sub { color: #a1a1aa; font-size: clamp(1rem, 2vw, 1.25rem); max-width: 620px; margin: 0 auto; }

.w3-stats { display: flex; justify-content: center; gap: clamp(1.5rem, 5vw, 4rem); margin-top: 2.5rem; flex-wrap: wrap; }
.w3-stat { display: flex; flex-direction: column; align-items: center; }
.w3-stat-num { font-size: clamp(1.6rem, 4vw, 2.4rem); font-weight: 700; color: #fff; text-shadow: 0 0 24px rgba(245, 184, 0, 0.4); }
.w3-stat-label { color: #71717a; font-size: .8rem; letter-spacing: .12em; text-transform: uppercase; margin-top: .3rem; }

/* bento grid */
.w3-grid {
  display: grid; gap: 1rem;
  grid-template-columns: repeat(4, 1fr);
  grid-auto-rows: 200px;
  max-width: 1280px; margin: 2rem auto 4rem; padding: 0 clamp(1rem, 4vw, 2rem);
}
.tile-lg { grid-column: span 2; grid-row: span 2; }
.tile-wide { grid-column: span 2; }
.tile-sm { grid-column: span 1; grid-row: span 1; }
@media (max-width: 820px) {
  .w3-grid { grid-template-columns: repeat(2, 1fr); }
  .tile-lg, .tile-wide { grid-column: span 2; }
}

.w3-card {
  position: relative; border-radius: 20px; overflow: hidden; text-decoration: none; color: inherit;
  background: var(--panel); border: 1px solid var(--border);
  backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
  transition: transform .25s ease, box-shadow .25s ease, border-color .25s ease;
  display: flex; flex-direction: column;
}
.w3-card:hover { transform: translateY(-4px); border-color: rgba(245, 184, 0, 0.5); box-shadow: 0 20px 50px rgba(0,0,0,.5), 0 0 40px rgba(224, 31, 38, 0.15); }
.w3-thumb { position: relative; flex: 1; min-height: 90px; background-size: cover; background-position: center; }
.w3-thumb-overlay { position: absolute; inset: 0; background: linear-gradient(180deg, transparent 30%, rgba(8,8,12,.85)); }
.w3-card-body { position: relative; padding: .85rem 1rem 1rem; }
.tile-lg .w3-card-body { padding: 1.2rem 1.4rem 1.4rem; }

.w3-author { display: flex; align-items: center; gap: .45rem; font-size: .8rem; color: #a1a1aa; margin-bottom: .4rem; }
.w3-author img { width: 22px; height: 22px; border-radius: 50%; }
.w3-dot { opacity: .5; }
.w3-card-title { font-size: 1rem; font-weight: 600; line-height: 1.25; margin: 0 0 .7rem; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.tile-lg .w3-card-title { font-size: 1.6rem; -webkit-line-clamp: 3; }

.w3-meta { display: flex; align-items: center; gap: .7rem; flex-wrap: wrap; }
.w3-pill {
  font-size: .78rem; padding: .3rem .7rem; border-radius: 999px; font-weight: 700;
  color: var(--gold); background: rgba(245, 184, 0, 0.12); border: 1px solid rgba(245, 184, 0, 0.35);
  box-shadow: 0 0 16px rgba(245, 184, 0, 0.18);
}
.w3-pill b { color: #fff; font-weight: 700; }
.w3-stat-mini { font-size: .8rem; color: #a1a1aa; }

.w3-foot { text-align: center; color: #52525b; padding: 2rem; font-size: .85rem; }
.w3-foot a { color: var(--gold); }
</style>
