<template>
  <div class="hub">
    <!-- top bar -->
    <header class="hub-top">
      <div class="hub-top-inner">
        <div class="hub-brand">
          <img src="/logo.png" alt="BBH">
          <span>The BBH Project</span>
        </div>
        <div class="hub-search">
          <input placeholder="Search posts, people, tags…" readonly>
        </div>
        <nav class="hub-topnav">
          <a href="/" class="hub-topnav-link">← live site</a>
          <button class="hub-bell">🔔<span class="hub-badge">3</span></button>
          <div class="hub-me">
            <img src="https://images.hive.blog/u/borniet/avatar" alt="">
            <span>borniet ▾</span>
          </div>
        </nav>
      </div>
    </header>

    <div class="hub-grid">
      <!-- LEFT rail -->
      <aside class="hub-left">
        <div class="hub-card hub-you">
          <img class="hub-you-avatar" src="https://images.hive.blog/u/borniet/avatar" alt="">
          <div class="hub-you-name">@borniet</div>
          <div class="hub-you-stats">
            <div><b class="mono">115.5</b><span>BBHO</span></div>
            <div><b class="mono">98%</b><span>Voting</span></div>
          </div>
          <div class="hub-vp">
            <div class="hub-vp-bar" style="width: 98%" />
          </div>
          <button class="hub-post-btn">✎ Create a post</button>
        </div>

        <div class="hub-card">
          <div class="hub-card-title">Trending tags</div>
          <a v-for="tag in tags" :key="tag" class="hub-tag" href="/trending">#{{ tag }}</a>
        </div>

        <nav class="hub-card hub-menu">
          <a class="hub-menu-item active" href="#">🏠 Home</a>
          <a class="hub-menu-item" href="/trending">🔥 Trending</a>
          <a class="hub-menu-item" href="#">👥 Following</a>
          <a class="hub-menu-item" href="#">💰 Wallet</a>
        </nav>
      </aside>

      <!-- CENTER feed -->
      <main class="hub-feed">
        <div class="hub-feed-head">
          <button class="hub-chip active">Latest</button>
          <button class="hub-chip">Trending</button>
          <button class="hub-chip">Following</button>
        </div>

        <article v-for="(post, i) in posts" :key="i" class="hub-card hub-post">
          <div class="hub-post-head">
            <img :src="`https://images.hive.blog/u/${post.author}/avatar`" alt="">
            <div>
              <div class="hub-post-author">@{{ post.author }}</div>
              <div class="hub-post-time">{{ ago(post.created) }} · #{{ (post.tags || '').split(',')[0] || 'bbh' }}</div>
            </div>
            <span class="hub-reward mono">◈ {{ payout(post) }} BBHO</span>
          </div>

          <a class="hub-post-link" :href="`/@${post.author}/${post.permlink}`">
            <h3 class="hub-post-title">{{ post.title || 'Untitled' }}</h3>
            <p class="hub-post-excerpt">{{ excerpt(post) }}</p>
            <div v-if="firstImage(post)" class="hub-post-img" :style="{ backgroundImage: `url(https://images.hive.blog/800x0/${firstImage(post)})` }" />
          </a>

          <div class="hub-post-actions">
            <button class="hub-act hub-vote">♥ <span>{{ post.active_votes ? post.active_votes.length : 0 }}</span></button>
            <button class="hub-act">💬 <span>{{ post.children || 0 }}</span></button>
            <button class="hub-act">↻ Reblog</button>
            <button class="hub-act hub-act-right">⤴ Share</button>
          </div>
        </article>
      </main>

      <!-- RIGHT rail -->
      <aside class="hub-right">
        <div class="hub-card">
          <div class="hub-card-title">🏆 Top earners</div>
          <div v-for="(u, i) in leaders" :key="u.author" class="hub-leader">
            <span class="hub-rank" :class="{ gold: i === 0 }">{{ i + 1 }}</span>
            <img :src="`https://images.hive.blog/u/${u.author}/avatar`" alt="">
            <span class="hub-leader-name">@{{ u.author }}</span>
            <span class="hub-leader-amt mono">{{ u.total.toFixed(0) }}</span>
          </div>
        </div>

        <div class="hub-card">
          <div class="hub-card-title">⚡ Live activity</div>
          <div v-for="(a, i) in activity" :key="i" class="hub-activity">
            <span class="hub-dot" />
            <span><b>@{{ a.author }}</b> {{ a.verb }} <span class="hub-muted">{{ ago(a.created) }}</span></span>
          </div>
        </div>
      </aside>
    </div>

    <footer class="hub-foot">
      Prototype · Community Hub concept · real BBHO data · <a href="/preview">see the Web3 Bold version</a> · <a href="/">live site</a>
    </footer>
  </div>
</template>

<script setup>
// Community Hub redesign PROTOTYPE — standalone showcase (layout:false), real data.
import { useScotStore } from '~/stores/scot'

definePageMeta({ layout: false })

useHead({
  title: 'BBH · Community Hub preview',
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@600&display=swap' }
  ]
})

const scot = useScotStore()

const { data: posts } = await useAsyncData('hub-posts', async () => {
  const p = await scot.fetchPosts({ endpoint: 'get_discussions_by_created', params: { limit: 8 } })
  return Array.isArray(p) ? p : []
}, { default: () => [] })

const parseMeta = (post) => {
  try { return typeof post.json_metadata === 'string' ? JSON.parse(post.json_metadata) : (post.json_metadata || {}) } catch { return {} }
}
const firstImage = (post) => {
  const meta = parseMeta(post)
  if (meta.image && meta.image.length) { return meta.image[0] }
  const m = (post.body || '').match(/https?:\/\/[^\s)"']+\.(?:png|jpe?g|gif|webp)/i)
  return m ? m[0] : null
}
const payout = (post) => {
  const v = Number(post.estimated_payout_value ?? post.total_payout_value ?? 0)
  return v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v.toFixed(2)
}
const excerpt = (post) => {
  const t = (post.body || '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[#>*_`~-]/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return t.slice(0, 150) + (t.length > 150 ? '…' : '')
}
const ago = (created) => {
  const d = new Date(`${created}Z`).getTime()
  const s = Math.max(1, Math.round((Date.now() - d) / 1000))
  if (s < 3600) { return Math.round(s / 60) + 'm ago' }
  if (s < 86400) { return Math.round(s / 3600) + 'h ago' }
  return Math.round(s / 86400) + 'd ago'
}

const tags = computed(() => {
  const seen = []
  posts.value.forEach((p) => { (p.tags || '').split(',').forEach((t) => { if (t && !seen.includes(t) && seen.length < 8) { seen.push(t) } }) })
  return seen.length ? seen : ['bbh', 'hive', 'life', 'travel', 'food']
})

const leaders = computed(() => {
  const map = {}
  posts.value.forEach((p) => { map[p.author] = (map[p.author] || 0) + Number(p.estimated_payout_value ?? p.total_payout_value ?? 0) })
  return Object.entries(map).map(([author, total]) => ({ author, total })).sort((a, b) => b.total - a.total).slice(0, 5)
})

const activity = computed(() => {
  const verbs = ['published a post', 'earned a reward', 'got 5 upvotes', 'joined a discussion']
  return posts.value.slice(0, 6).map((p, i) => ({ author: p.author, verb: verbs[i % verbs.length], created: p.created }))
})
</script>

<style scoped>
.hub {
  --red: #e01f26;
  --gold: #f0a500;
  --ink: #14171a;
  --muted: #667085;
  --line: #e7e9ee;
  --surface: #ffffff;
  --bg: #f4f5f8;
  min-height: 100vh;
  background: var(--bg);
  color: var(--ink);
  font-family: 'Inter', system-ui, sans-serif;
}
.mono { font-family: 'JetBrains Mono', monospace; }

.hub-top { position: sticky; top: 0; z-index: 10; background: rgba(255,255,255,.85); backdrop-filter: blur(10px); border-bottom: 1px solid var(--line); }
.hub-top-inner { max-width: 1360px; margin: 0 auto; display: flex; align-items: center; gap: 1.5rem; padding: .7rem clamp(1rem, 3vw, 2rem); }
.hub-brand { display: flex; align-items: center; gap: .6rem; font-weight: 800; font-size: 1.05rem; }
.hub-brand img { width: 36px; height: 36px; }
.hub-search { flex: 1; }
.hub-search input { width: 100%; max-width: 440px; border: 1px solid var(--line); background: var(--bg); border-radius: 999px; padding: .6rem 1.1rem; font: inherit; color: var(--muted); }
.hub-topnav { display: flex; align-items: center; gap: 1rem; }
.hub-topnav-link { color: var(--muted); text-decoration: none; font-size: .9rem; }
.hub-bell { position: relative; border: 0; background: none; font-size: 1.1rem; cursor: pointer; }
.hub-badge { position: absolute; top: -4px; right: -6px; background: var(--red); color: #fff; font-size: .6rem; font-weight: 700; border-radius: 999px; padding: 1px 5px; }
.hub-me { display: flex; align-items: center; gap: .5rem; font-weight: 600; font-size: .9rem; }
.hub-me img { width: 30px; height: 30px; border-radius: 50%; }

.hub-grid { max-width: 1360px; margin: 1.4rem auto; display: grid; grid-template-columns: 250px 1fr 300px; gap: 1.4rem; padding: 0 clamp(1rem, 3vw, 2rem); align-items: start; }
@media (max-width: 1080px) { .hub-grid { grid-template-columns: 1fr; } .hub-left, .hub-right { display: none; } }

.hub-left, .hub-right { position: sticky; top: 78px; display: flex; flex-direction: column; gap: 1.1rem; }

.hub-card { background: var(--surface); border: 1px solid var(--line); border-radius: 16px; padding: 1.1rem; box-shadow: 0 1px 2px rgba(16,24,40,.04); }
.hub-card-title { font-weight: 700; font-size: .85rem; margin-bottom: .8rem; }

.hub-you { text-align: center; }
.hub-you-avatar { width: 64px; height: 64px; border-radius: 50%; border: 3px solid var(--gold); }
.hub-you-name { font-weight: 700; margin-top: .5rem; }
.hub-you-stats { display: flex; justify-content: center; gap: 1.5rem; margin: .8rem 0 .6rem; }
.hub-you-stats b { display: block; font-size: 1.15rem; }
.hub-you-stats span { font-size: .72rem; color: var(--muted); }
.hub-vp { height: 6px; background: var(--line); border-radius: 999px; overflow: hidden; margin-bottom: 1rem; }
.hub-vp-bar { height: 100%; background: linear-gradient(90deg, var(--gold), var(--red)); }
.hub-post-btn { width: 100%; border: 0; border-radius: 10px; padding: .7rem; font-weight: 700; color: #fff; background: linear-gradient(135deg, var(--red), #ff5a3c); cursor: pointer; box-shadow: 0 6px 16px rgba(224,31,38,.25); }

.hub-tag { display: inline-block; margin: 0 .35rem .5rem 0; padding: .3rem .7rem; background: var(--bg); border-radius: 999px; font-size: .8rem; font-weight: 600; color: var(--red); text-decoration: none; }
.hub-tag:hover { background: #ffe9e9; }

.hub-menu { display: flex; flex-direction: column; gap: .2rem; padding: .6rem; }
.hub-menu-item { padding: .6rem .8rem; border-radius: 10px; text-decoration: none; color: var(--ink); font-weight: 600; font-size: .92rem; }
.hub-menu-item:hover { background: var(--bg); }
.hub-menu-item.active { background: #fff0f0; color: var(--red); }

.hub-feed { display: flex; flex-direction: column; gap: 1.1rem; }
.hub-feed-head { display: flex; gap: .5rem; }
.hub-chip { border: 1px solid var(--line); background: var(--surface); border-radius: 999px; padding: .45rem 1.1rem; font-weight: 600; font-size: .88rem; cursor: pointer; }
.hub-chip.active { background: var(--ink); color: #fff; border-color: var(--ink); }

.hub-post { transition: box-shadow .2s ease, transform .2s ease; }
.hub-post:hover { box-shadow: 0 10px 30px rgba(16,24,40,.10); transform: translateY(-2px); }
.hub-post-head { display: flex; align-items: center; gap: .7rem; margin-bottom: .8rem; }
.hub-post-head img { width: 40px; height: 40px; border-radius: 50%; }
.hub-post-author { font-weight: 700; font-size: .92rem; }
.hub-post-time { color: var(--muted); font-size: .78rem; }
.hub-reward { margin-left: auto; color: #b8860b; background: #fff7e0; border: 1px solid #f5deb3; padding: .3rem .7rem; border-radius: 999px; font-size: .78rem; font-weight: 700; }
.hub-post-link { text-decoration: none; color: inherit; display: block; }
.hub-post-title { font-size: 1.25rem; font-weight: 700; margin: 0 0 .4rem; line-height: 1.25; }
.hub-post-excerpt { color: var(--muted); font-size: .95rem; line-height: 1.5; margin: 0 0 .8rem; }
.hub-post-img { height: 260px; border-radius: 12px; background-size: cover; background-position: center; }
.hub-post-actions { display: flex; align-items: center; gap: .4rem; margin-top: .9rem; padding-top: .8rem; border-top: 1px solid var(--line); }
.hub-act { border: 0; background: var(--bg); border-radius: 999px; padding: .45rem .9rem; font-weight: 600; font-size: .85rem; color: var(--ink); cursor: pointer; }
.hub-act:hover { background: #eceef3; }
.hub-vote:hover { background: #ffe9e9; color: var(--red); }
.hub-act-right { margin-left: auto; }

.hub-leader { display: flex; align-items: center; gap: .6rem; padding: .4rem 0; }
.hub-rank { width: 20px; text-align: center; font-weight: 700; color: var(--muted); font-size: .85rem; }
.hub-rank.gold { color: var(--gold); }
.hub-leader img { width: 30px; height: 30px; border-radius: 50%; }
.hub-leader-name { font-size: .85rem; font-weight: 600; }
.hub-leader-amt { margin-left: auto; font-size: .82rem; color: #b8860b; font-weight: 700; }

.hub-activity { display: flex; gap: .5rem; align-items: flex-start; padding: .35rem 0; font-size: .82rem; }
.hub-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--gold); margin-top: .35rem; flex-shrink: 0; }
.hub-muted { color: var(--muted); }

.hub-foot { text-align: center; color: var(--muted); padding: 2rem; font-size: .85rem; }
.hub-foot a { color: var(--red); }
</style>
