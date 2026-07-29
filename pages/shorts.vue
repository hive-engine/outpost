<template>
  <div class="shorts-page">
    <div class="shorts-topbar">
      <h1 class="shorts-title"><fa-icon icon="film" /> Shorts</h1>
      <span class="shorts-sub">Vertical video from across Hive · powered by 3Speak</span>
      <nuxt-link v-if="auth.loggedIn" class="shorts-upload" :to="{ name: 'upload' }">
        <fa-icon icon="plus" /> Upload
      </nuxt-link>
    </div>

    <div class="shorts-tabs">
      <button
        v-for="t in tabs"
        :key="t.key"
        class="shorts-tab"
        :class="{ active: mode === t.key }"
        @click="switchMode(t.key)"
      >
        {{ t.label }}
      </button>
    </div>

    <loading v-if="loading && !shorts.length" />

    <div v-else-if="shorts.length" ref="scroller" class="shorts-scroller" @scroll.passive="onScroll">
      <section
        v-for="(s, i) in shorts"
        :key="keyOf(s)"
        class="short-panel"
      >
        <div class="short-media">
          <iframe
            v-if="active === i"
            :src="playerSrc(s)"
            class="short-iframe"
            allow="autoplay; fullscreen; picture-in-picture"
            allowfullscreen
            frameborder="0"
          />
          <button v-else class="short-thumb" :style="thumbStyle(s)" @click="active = i">
            <span class="short-play"><fa-icon icon="play" /></span>
          </button>
        </div>

        <div class="short-info">
          <nuxt-link :to="authorLink(s)" class="short-author">
            <b-avatar :src="`${config.IMAGES_CDN}u/${authorOf(s)}/avatar`" variant="dark" size="34px" />
            <span>@{{ authorOf(s) }}</span>
          </nuxt-link>

          <p v-if="s.caption" class="short-caption">{{ s.caption }}</p>

          <div class="short-stats">
            <span><fa-icon icon="eye" /> {{ fmt(s.views) }}</span>
            <span v-if="s.votes != null"><fa-icon icon="heart" /> {{ fmt(s.votes) }}</span>
            <span v-if="s.comments != null"><fa-icon icon="comment-alt" /> {{ fmt(s.comments) }}</span>
            <span v-if="s.reward" class="short-reward mono">${{ Number(s.reward).toFixed(2) }}</span>
          </div>

          <nuxt-link :to="postLink(s)" class="short-open">Open post &amp; comments →</nuxt-link>
        </div>
      </section>

      <div v-if="loadingMore" class="shorts-more"><loading small /></div>
      <div v-else-if="done" class="shorts-end">You're all caught up ✨</div>
    </div>

    <div v-else class="shorts-empty">
      <fa-icon icon="film" /> No shorts to show right now.
    </div>
  </div>
</template>

<script>
// 3Speak Shorts — a vertical, TikTok-style discovery feed backed by 3Speak's
// open checker API (no auth, CORS-open). Only the in-view short mounts a live
// player iframe (others show their thumbnail) so exactly one video plays at a
// time and the page stays light. Each short links to its Hive post for
// comments/votes on our own site.
import Loading from '@/components/Loading.vue'
import { useAuthStore } from '~/stores/auth'

const CHECKER = 'https://checker.3speak.tv'

export default {
  name: 'ShortsPage',

  components: { Loading },

  setup () {
    const config = useRuntimeConfig().public
    const auth = useAuthStore()
    useHead({ title: 'Shorts' })
    return { config, auth }
  },

  data () {
    return {
      mode: 'trending',
      tabs: [
        { key: 'trending', label: 'Trending' },
        { key: 'latest', label: 'Latest' },
        { key: 'bbh', label: 'BBH' }
      ],
      shorts: [],
      active: 0,
      page: 1,
      totalPages: 1,
      seed: null,
      loading: true,
      loadingMore: false,
      done: false
    }
  },

  async mounted () {
    // Stable seed per session so pagination hits 3Speak's 15-min ranked cache.
    this.seed = Date.now()
    await this.loadPage()
    this.loading = false
  },

  methods: {
    keyOf (s) { return `${s.owner}/${s.permlink}` },

    authorOf (s) {
      // The Hive author is the first half of embed_url (@author/permlink); owner
      // is the asset uploader — usually the same, but key on the Hive author.
      const m = /^@?([^/]+)\//.exec(s.embed_url || '')
      return m ? m[1] : s.owner
    },

    postPermlink (s) {
      const m = /\/(.+)$/.exec((s.embed_url || '').replace(/^@/, ''))
      return m ? m[1] : s.permlink
    },

    authorLink (s) { return { name: 'user', params: { user: this.authorOf(s) } } },
    postLink (s) { return { name: 'user-post', params: { user: this.authorOf(s), post: this.postPermlink(s) } } },

    playerSrc (s) { return `https://play.3speak.tv/embed?v=${s.owner}/${s.permlink}&autoplay=1` },

    thumbStyle (s) {
      return s.thumbnail_url ? { backgroundImage: `url('${s.thumbnail_url}')` } : {}
    },

    cleanCaption (raw) {
      let t = raw || ''
      // Bodies can be HTML or markdown and lead with the embed/iframe — reduce to
      // readable caption text.
      t = t.replace(/<[^>]+>/g, ' ') // strip HTML tags (incl. the iframe embed)
        .replace(/!\[[^\]]*\]\([^)]*\)/g, '') // markdown images
        .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // markdown links → their text
        .replace(/https?:\/\/[^\s)]+/g, '') // bare URLs
        .replace(/[#>*_`~]+/g, ' ') // markdown symbols (keep hyphens in words)
        .replace(/\s+/g, ' ')
        .trim()
      return t.length > 180 ? `${t.slice(0, 180)}…` : t
    },

    fmt (n) {
      n = Number(n) || 0
      return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`
    },

    // Normalise the two feed shapes to one item the template renders: shortssorted
    // (rich stats + hive_body) and /shorts (leaner — embed_title + createdAt, no
    // vote/comment/reward, which the template then hides).
    normalize (s) {
      return {
        owner: s.owner,
        permlink: s.permlink,
        embed_url: s.embed_url,
        thumbnail_url: s.thumbnail_url || null,
        caption: this.cleanCaption(s.hive_body || s.hive_title || s.embed_title || ''),
        views: s.views,
        votes: s.hive_votes != null ? s.hive_votes : null,
        comments: s.hive_comments != null ? s.hive_comments : null,
        reward: s.hive_reward != null ? s.hive_reward : null,
        createdAt: s.createdAt || s.created || null
      }
    },

    // Endpoint + params for the active tab. 'trending' = engagement-ranked
    // (shortssorted); 'latest'/'bbh' = the recency /shorts feed (all apps / BBH only).
    endpointFor () {
      if (this.mode === 'trending') {
        return { url: `${CHECKER}/shortssorted`, params: { page: this.page, limit: 12, seed: this.seed } }
      }
      // /shorts treats app as a literal filter — 'all' matches nothing, so OMIT it
      // for the Latest (all apps) tab and only send it for BBH.
      const params = { page: this.page, limit: 12 }
      if (this.mode === 'bbh') { params.app = this.config.THREESPEAK_APP || 'thebbhproject' }
      return { url: `${CHECKER}/shorts`, params }
    },

    async loadPage () {
      try {
        const { url, params } = this.endpointFor()
        const res = await $fetch(url, { params, timeout: 9000 })

        const batch = (res && res.shorts) || []
        // dedupe against what we already have (feeds can repeat across pages)
        const seen = new Set(this.shorts.map(this.keyOf))
        let fresh = batch
          .filter(s => s && s.embed_url && !seen.has(`${s.owner}/${s.permlink}`))
          .map(this.normalize)

        // Recency feeds ('latest'/'bbh') — newest first.
        if (this.mode !== 'trending') {
          fresh = fresh.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
        }

        this.shorts.push(...fresh)
        this.totalPages = res && res.totalPages ? res.totalPages : this.totalPages
        if (this.page >= this.totalPages || batch.length === 0) { this.done = true }
      } catch {
        this.done = true
      }
    },

    async switchMode (key) {
      if (key === this.mode) { return }
      this.mode = key
      this.shorts = []
      this.active = 0
      this.page = 1
      this.totalPages = 1
      this.done = false
      this.loading = true
      if (this.$refs.scroller) { this.$refs.scroller.scrollTop = 0 }
      await this.loadPage()
      this.loading = false
    },

    async loadMore () {
      if (this.loadingMore || this.done) { return }
      this.loadingMore = true
      this.page += 1
      await this.loadPage()
      this.loadingMore = false
    },

    onScroll () {
      const el = this.$refs.scroller
      if (!el) { return }

      // The panel filling the viewport is the active (playing) one.
      const idx = Math.round(el.scrollTop / el.clientHeight)
      if (idx !== this.active && idx >= 0 && idx < this.shorts.length) {
        this.active = idx
      }

      // Prefetch the next page as we near the end.
      if (idx >= this.shorts.length - 3) { this.loadMore() }
    }
  }
}
</script>

<style scoped>
.shorts-page { position: relative; }

.shorts-topbar {
  display: flex;
  align-items: baseline;
  gap: .8rem;
  flex-wrap: wrap;
  padding: 1rem clamp(.9rem, 3vw, 1.4rem) .8rem;
  border-bottom: 1px solid var(--w3-border);
}
.shorts-title {
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 700;
  font-size: 1.6rem;
  margin: 0;
  background: linear-gradient(135deg, var(--w3-gold), #ffd34d);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
.shorts-sub { color: var(--w3-muted); font-size: .85rem; }
.shorts-upload {
  margin-left: auto;
  padding: .35rem 1rem;
  border-radius: 999px;
  font-weight: 700;
  font-size: .85rem;
  text-decoration: none;
  color: #1a1206;
  background: linear-gradient(135deg, var(--w3-gold), #ffd34d);
}
.shorts-upload:hover { filter: brightness(1.05); }

/* tab bar (Trending / Latest / BBH) */
.shorts-tabs {
  display: flex;
  gap: .5rem;
  padding: .55rem clamp(.9rem, 3vw, 1.4rem);
  border-bottom: 1px solid var(--w3-border);
}
.shorts-tab {
  border: 1px solid var(--w3-border);
  background: transparent;
  color: var(--w3-muted);
  font-weight: 700;
  font-size: .82rem;
  padding: .3rem .95rem;
  border-radius: 999px;
  cursor: pointer;
  transition: color .15s ease, border-color .15s ease, background .15s ease;
}
.shorts-tab:hover { color: var(--w3-text); border-color: var(--w3-gold); }
.shorts-tab.active {
  color: #1a1206;
  background: linear-gradient(135deg, var(--w3-gold), #ffd34d);
  border-color: transparent;
}

/* vertical snap scroller */
.shorts-scroller {
  height: calc(100vh - 64px - 58px - 50px);
  /* dvh (dynamic viewport height) tracks the mobile address bar so the feed
     doesn't jump/pop to the top as it shows/hides while scrolling. */
  height: calc(100dvh - 64px - 58px - 50px);
  overflow-y: scroll;
  scroll-snap-type: y mandatory;
  scrollbar-width: none;
  /* keep the scroll inside the feed — don't chain to the page (the "pops to top"
     symptom on mobile) — and use momentum scrolling on iOS. */
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
  touch-action: pan-y;
}
.shorts-scroller::-webkit-scrollbar { display: none; }

.short-panel {
  height: 100%;
  scroll-snap-align: start;
  scroll-snap-stop: always;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1.2rem;
  padding: 1rem;
  position: relative;
}

.short-media {
  height: min(88%, 720px);
  aspect-ratio: 9 / 16;
  background: #000;
  border-radius: 18px;
  overflow: hidden;
  border: 1px solid var(--w3-border);
  box-shadow: 0 12px 50px rgba(0, 0, 0, .5);
  flex: 0 0 auto;
}
.short-iframe { width: 100%; height: 100%; display: block; }
.short-thumb {
  width: 100%; height: 100%;
  border: none;
  background-size: cover;
  background-position: center;
  background-color: #111;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.short-play {
  width: 68px; height: 68px;
  border-radius: 50%;
  background: rgba(8, 8, 12, .55);
  backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-size: 1.5rem;
  border: 2px solid rgba(255, 255, 255, .5);
  transition: transform .15s ease, background .15s ease;
}
.short-thumb:hover .short-play { transform: scale(1.1); background: var(--w3-gold); color: #1a1206; }

/* info column (desktop beside, mobile overlaid) */
.short-info {
  width: 260px;
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  gap: .7rem;
}
.short-author { display: flex; align-items: center; gap: .5rem; color: var(--w3-text); font-weight: 700; text-decoration: none; }
.short-author:hover { color: var(--w3-gold); }
.short-caption { color: var(--w3-text); font-size: .95rem; line-height: 1.5; margin: 0; }
.short-stats { display: flex; flex-wrap: wrap; gap: .9rem; color: var(--w3-muted); font-size: .85rem; font-weight: 600; }
.short-reward { color: #2ecc71; }
.short-open {
  align-self: flex-start;
  margin-top: .2rem;
  padding: .45rem 1rem;
  border-radius: 999px;
  font-weight: 700;
  font-size: .85rem;
  text-decoration: none;
  color: #1a1206;
  background: linear-gradient(135deg, var(--w3-gold), #ffd34d);
}

.shorts-more, .shorts-end {
  height: 60px;
  display: flex; align-items: center; justify-content: center;
  color: var(--w3-muted);
}
.shorts-empty { text-align: center; color: var(--w3-muted); padding: 4rem 1rem; }

@media (max-width: 720px) {
  .short-panel { padding: 0; }
  .short-media { height: 100%; width: 100%; border-radius: 0; aspect-ratio: auto; }
  /* info overlaid at the bottom on mobile */
  .short-info {
    position: absolute;
    left: 0; right: 0; bottom: 0;
    width: auto;
    padding: 1rem 1rem 1.4rem;
    background: linear-gradient(transparent, rgba(8, 8, 12, .85) 55%);
    z-index: 2;
  }
}
</style>
