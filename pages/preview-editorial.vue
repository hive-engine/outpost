<template>
  <div class="ed">
    <!-- masthead -->
    <header class="ed-mast">
      <div class="ed-mast-top">
        <span class="ed-date">{{ today }}</span>
        <nav class="ed-nav">
          <a href="/trending">Explore</a>
          <a href="/">Live site</a>
          <a class="ed-signin" href="/">Sign in</a>
        </nav>
      </div>
      <a href="/" class="ed-title">The BBH Project</a>
      <p class="ed-tagline">Writing, community &amp; rewards on Hive</p>
      <div class="ed-rule" />
    </header>

    <template v-if="featured">
      <!-- featured hero -->
      <a class="ed-hero" :href="`/@${featured.author}/${featured.permlink}`">
        <div class="ed-hero-media" :style="heroStyle" />
        <div class="ed-hero-text">
          <span class="ed-kicker">Featured · #{{ topTag(featured) }}</span>
          <h2 class="ed-hero-title">{{ featured.title }}</h2>
          <p class="ed-hero-excerpt">{{ excerpt(featured, 220) }}</p>
          <div class="ed-byline">
            <img :src="`https://images.hive.blog/u/${featured.author}/avatar`" alt="">
            <span>By <b>@{{ featured.author }}</b></span>
            <span class="ed-sep">·</span>
            <span>{{ ago(featured.created) }}</span>
            <span class="ed-reward">{{ payout(featured) }} BBHO</span>
          </div>
        </div>
      </a>

      <div class="ed-section-head">
        <h3>Latest stories</h3>
        <div class="ed-rule thin" />
      </div>

      <!-- article grid -->
      <main class="ed-grid">
        <a v-for="(post, i) in rest" :key="i" class="ed-article" :href="`/@${post.author}/${post.permlink}`">
          <div class="ed-art-media" :style="mediaStyle(post, i)" />
          <span class="ed-kicker">#{{ topTag(post) }}</span>
          <h4 class="ed-art-title">{{ post.title || 'Untitled' }}</h4>
          <p class="ed-art-excerpt">{{ excerpt(post, 120) }}</p>
          <div class="ed-byline sm">
            <span>@{{ post.author }}</span>
            <span class="ed-sep">·</span>
            <span>{{ ago(post.created) }}</span>
            <span class="ed-reward sm">{{ payout(post) }} BBHO</span>
          </div>
        </a>
      </main>
    </template>

    <footer class="ed-foot">
      Prototype · Editorial concept · real BBHO data ·
      <a href="/preview">Web3 Bold</a> · <a href="/preview-hub">Community Hub</a> · <a href="/">live site</a>
    </footer>
  </div>
</template>

<script setup>
// Editorial redesign PROTOTYPE — standalone showcase (layout:false), real data.
import { useScotStore } from '~/stores/scot'

definePageMeta({ layout: false })

useHead({
  title: 'BBH · Editorial preview',
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600&display=swap' }
  ]
})

const scot = useScotStore()

const { data: posts } = await useAsyncData('ed-posts', async () => {
  const p = await scot.fetchPosts({ endpoint: 'get_discussions_by_created', params: { limit: 10 } })
  return Array.isArray(p) ? p : []
}, { default: () => [] })

// prefer a post with an image as the featured story
const featured = computed(() => posts.value.find(p => firstImage(p)) || posts.value[0] || null)
const rest = computed(() => posts.value.filter(p => p !== featured.value).slice(0, 6))

const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

const parseMeta = (post) => {
  try { return typeof post.json_metadata === 'string' ? JSON.parse(post.json_metadata) : (post.json_metadata || {}) } catch { return {} }
}
const firstImage = (post) => {
  const meta = parseMeta(post)
  if (meta.image && meta.image.length) { return meta.image[0] }
  const m = (post.body || '').match(/https?:\/\/[^\s)"']+\.(?:png|jpe?g|gif|webp)/i)
  return m ? m[0] : null
}
const heroStyle = computed(() => {
  const img = featured.value && firstImage(featured.value)
  return img ? { backgroundImage: `url(https://images.hive.blog/1280x0/${img})` } : { background: 'linear-gradient(135deg,#e01f26,#f0a500)' }
})
const mediaStyle = (post, i) => {
  const img = firstImage(post)
  const grads = ['linear-gradient(135deg,#2b2b2b,#555)', 'linear-gradient(135deg,#e01f26,#f0a500)', 'linear-gradient(135deg,#3a3a3a,#1a1a1a)']
  return img ? { backgroundImage: `url(https://images.hive.blog/640x0/${img})` } : { background: grads[i % grads.length] }
}
const topTag = (post) => ((post.tags || '').split(',')[0] || 'bbh')
const payout = (post) => {
  const v = Number(post.estimated_payout_value ?? post.total_payout_value ?? 0)
  return v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v.toFixed(0)
}
const excerpt = (post, n = 150) => {
  const t = (post.body || '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/https?:\/\/\S+/g, '').replace(/[#>*_`~-]/g, '').replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ').trim()
  return t.slice(0, n) + (t.length > n ? '…' : '')
}
const ago = (created) => {
  const d = new Date(`${created}Z`).getTime()
  const s = Math.max(1, Math.round((Date.now() - d) / 1000))
  if (s < 3600) { return Math.round(s / 60) + ' min ago' }
  if (s < 86400) { return Math.round(s / 3600) + ' hours ago' }
  return Math.round(s / 86400) + ' days ago'
}
</script>

<style scoped>
.ed {
  --ink: #1b1a17;
  --muted: #6b6862;
  --line: #e4e0d8;
  --paper: #fbfaf7;
  --red: #b5232a;
  min-height: 100vh;
  background: var(--paper);
  color: var(--ink);
  font-family: 'Inter', system-ui, sans-serif;
}

.ed-mast { max-width: 1120px; margin: 0 auto; padding: 1.4rem clamp(1.2rem, 4vw, 2rem) 0; text-align: center; }
.ed-mast-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.6rem; }
.ed-date { font-size: .78rem; color: var(--muted); letter-spacing: .02em; }
.ed-nav { display: flex; gap: 1.4rem; align-items: center; }
.ed-nav a { color: var(--ink); text-decoration: none; font-size: .85rem; font-weight: 500; }
.ed-nav a:hover { color: var(--red); }
.ed-signin { border: 1px solid var(--ink); border-radius: 999px; padding: .35rem 1rem; }
.ed-title { display: block; font-family: 'Fraunces', serif; font-weight: 600; font-size: clamp(2.4rem, 6vw, 4rem); letter-spacing: -0.02em; color: var(--ink); text-decoration: none; line-height: 1; }
.ed-tagline { font-family: 'Fraunces', serif; font-style: italic; color: var(--muted); margin: .6rem 0 1.4rem; font-size: 1.05rem; }
.ed-rule { height: 2px; background: var(--ink); }
.ed-rule.thin { height: 1px; background: var(--line); }

.ed-hero { max-width: 1120px; margin: 2.5rem auto; padding: 0 clamp(1.2rem, 4vw, 2rem); display: grid; grid-template-columns: 1.15fr 1fr; gap: clamp(1.5rem, 4vw, 3rem); align-items: center; text-decoration: none; color: inherit; }
@media (max-width: 800px) { .ed-hero { grid-template-columns: 1fr; } }
.ed-hero-media { height: 420px; border-radius: 4px; background-size: cover; background-position: center; }
.ed-kicker { font-size: .74rem; letter-spacing: .14em; text-transform: uppercase; color: var(--red); font-weight: 600; }
.ed-hero-title { font-family: 'Fraunces', serif; font-weight: 600; font-size: clamp(2rem, 4vw, 3rem); line-height: 1.08; letter-spacing: -0.02em; margin: .6rem 0 1rem; }
.ed-hero-excerpt { font-size: 1.1rem; line-height: 1.6; color: #3a3833; margin: 0 0 1.4rem; }

.ed-byline { display: flex; align-items: center; gap: .55rem; font-size: .9rem; color: var(--muted); }
.ed-byline img { width: 34px; height: 34px; border-radius: 50%; }
.ed-byline b { color: var(--ink); font-weight: 600; }
.ed-byline.sm { font-size: .8rem; gap: .4rem; margin-top: .6rem; }
.ed-sep { opacity: .5; }
.ed-reward { margin-left: auto; font-size: .74rem; letter-spacing: .04em; color: var(--red); border: 1px solid var(--line); border-radius: 999px; padding: .22rem .6rem; }
.ed-reward.sm { margin-left: auto; padding: .15rem .5rem; }

.ed-section-head { max-width: 1120px; margin: 3rem auto 0; padding: 0 clamp(1.2rem, 4vw, 2rem); }
.ed-section-head h3 { font-family: 'Fraunces', serif; font-weight: 600; font-size: 1.4rem; margin: 0 0 .8rem; }

.ed-grid { max-width: 1120px; margin: 1.6rem auto 3rem; padding: 0 clamp(1.2rem, 4vw, 2rem); display: grid; grid-template-columns: repeat(3, 1fr); gap: clamp(1.4rem, 3vw, 2.4rem); }
@media (max-width: 800px) { .ed-grid { grid-template-columns: 1fr; } }
.ed-article { text-decoration: none; color: inherit; display: block; }
.ed-art-media { height: 200px; border-radius: 4px; background-size: cover; background-position: center; margin-bottom: .9rem; }
.ed-art-title { font-family: 'Fraunces', serif; font-weight: 600; font-size: 1.3rem; line-height: 1.2; letter-spacing: -0.01em; margin: .35rem 0 .5rem; }
.ed-article:hover .ed-art-title { color: var(--red); }
.ed-art-excerpt { font-size: .95rem; line-height: 1.55; color: var(--muted); margin: 0; }

.ed-foot { text-align: center; color: var(--muted); padding: 2.5rem; font-size: .85rem; border-top: 1px solid var(--line); margin-top: 2rem; }
.ed-foot a { color: var(--red); }
</style>
