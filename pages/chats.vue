<template>
  <div class="chats-page">
    <div class="chats-layout">
      <!-- main column -->
      <div class="chats-main">
        <div class="chats-header">
          <h1 class="chats-title">Chats</h1>
          <p class="chats-sub">Short-form from across Hive, in one place. Say something.</p>
        </div>

        <!-- source selector -->
        <div class="source-bar">
          <button
            v-for="s of sourceTabs"
            :key="s.key"
            class="source-pill"
            :class="{ active: activeSource === s.key }"
            @click="switchSource(s.key)"
          >{{ s.label }}</button>
        </div>

        <!-- composer -->
        <template v-if="auth.loggedIn">
          <div class="compose-hint">Posting to <strong>{{ composeLabel }}</strong></div>
          <chat-composer ref="composer" :posting="posting" @submit="onComposerSubmit" />
        </template>
        <div v-else class="chat-loginbar">
          <nuxt-link :to="{ name: 'login' }">Log in</nuxt-link> to join the conversation.
        </div>

        <!-- sort tabs -->
        <div class="chats-tabs">
          <button class="chats-tab" :class="{ active: tab === 'latest' }" @click="tab = 'latest'">
            <fa-icon icon="bolt" /> Latest
          </button>
          <button class="chats-tab" :class="{ active: tab === 'trending' }" @click="tab = 'trending'">
            <fa-icon icon="fire" /> Trending
          </button>
        </div>

        <!-- new-chats pill -->
        <client-only>
          <transition name="pill">
            <button v-if="pendingChats.length" class="new-pill" @click="showNew">
              <fa-icon icon="arrow-up" /> {{ pendingChats.length }} new {{ pendingChats.length === 1 ? 'chat' : 'chats' }}
            </button>
          </transition>
        </client-only>

        <!-- timeline -->
        <div class="chats-feed">
          <loading v-if="pending" />

          <template v-else-if="sortedChats.length">
            <transition-group name="chat">
              <chat-card v-for="chat of sortedChats" :key="`${chat.author}/${chat.permlink}`" :chat="chat" :source="sourceLabel(chat._source)" />
            </transition-group>
          </template>

          <div v-else class="chats-empty">
            <div class="chats-empty-emoji">💬</div>
            <p>No chats here yet. Be the first!</p>
          </div>
        </div>
      </div>

      <!-- side rail -->
      <chats-sidebar class="chats-rail" />
    </div>
  </div>
</template>

<script>
// Short-form "Chats" feed — aggregates multiple Hive short-form sources (BBH
// Chats, PeakD Snaps, InLeo Threads, Ecency Waves) into one timeline. Each source
// is container-based (posts are replies to a rolling container post). A source
// selector switches between them (or "All", merged by time). Posting targets the
// VIEWED source's live container (in "All", our BBH home container).
//
// External containers are resolved via a raw JSON-RPC fetch with node failover
// (bridgeCall) rather than the dhive client, whose namespace routing errors
// intermittently on bridge.get_account_posts.
import { mapActions } from 'pinia'
import ChatCard from '@/components/cards/ChatCard.vue'
import ChatComposer from '@/components/cards/ChatComposer.vue'
import ChatsSidebar from '@/components/cards/ChatsSidebar.vue'
import Loading from '@/components/Loading.vue'
import { usePostStore } from '~/stores/post'
import { useTribeStore } from '~/stores/tribe'
import { useAuthStore } from '~/stores/auth'

export default {
  name: 'ChatsPage',

  components: { ChatCard, ChatComposer, ChatsSidebar, Loading },

  async setup () {
    const config = useRuntimeConfig().public
    const auth = useAuthStore()

    const nodes = Array.isArray(config.NODES) ? config.NODES : []
    const sources = config.CHATS_SOURCES || []
    const activeSource = ref('all')

    // Reliable JSON-RPC call with node failover (avoids dhive routing quirks).
    const bridgeCall = async (method, params) => {
      for (const node of nodes) {
        try {
          const res = await $fetch(node, {
            method: 'POST',
            body: { jsonrpc: '2.0', method, params, id: 1 },
            timeout: 6000
          })
          if (res && res.result !== undefined && res.result !== null) { return res.result }
        } catch { /* try next node */ }
      }
      return null
    }

    // Latest container(s) for a source: date-derived (BBH) or the account's posts.
    const resolveContainers = async (src, count) => {
      if (src.scheme === 'date') {
        const now = new Date()
        const out = []
        for (let i = 0; i < count; i++) {
          const d = new Date(now)
          d.setUTCDate(now.getUTCDate() - i)
          out.push({ author: src.account, permlink: `${src.prefix}${d.toISOString().slice(0, 10)}` })
        }
        return out
      }
      const recent = await bridgeCall('bridge.get_account_posts', { sort: 'posts', account: src.account, limit: count })
      return (Array.isArray(recent) ? recent : []).slice(0, count).map(p => ({ author: p.author, permlink: p.permlink }))
    }

    // Direct replies of a container = the short-form posts (light: direct children).
    const fetchReplies = async (container, sourceKey) => {
      const replies = await bridgeCall('condenser_api.get_content_replies', [container.author, container.permlink])
      const out = []
      if (Array.isArray(replies)) {
        for (const node of replies) {
          if (typeof node.json_metadata === 'string') {
            try { node.json_metadata = JSON.parse(node.json_metadata) } catch { node.json_metadata = {} }
          }
          node._source = sourceKey
          out.push(node)
        }
      }
      return out
    }

    const loadFeed = async (sourceKey) => {
      const active = sourceKey === 'all' ? sources : sources.filter(s => s.key === sourceKey)
      // "All" pulls just the latest container per source (keeps the merged feed
      // snappy — some containers hold hundreds of replies); single-source views
      // go a few containers deep.
      const perSource = sourceKey === 'all' ? 1 : 3

      const fetchSource = async (src) => {
        // Tag sources (D.Buzz) have no container — the tagged posts ARE the items.
        if (src.scheme === 'tag') {
          const posts = await bridgeCall('bridge.get_ranked_posts', {
            sort: 'created', tag: src.hiveTag, observer: '', limit: sourceKey === 'all' ? 12 : 20
          })
          const chats = (Array.isArray(posts) ? posts : []).map((p) => {
            if (typeof p.json_metadata === 'string') {
              try { p.json_metadata = JSON.parse(p.json_metadata) } catch { p.json_metadata = {} }
            }
            p._source = src.key
            return p
          })
          return { key: src.key, containers: [], chats }
        }
        const containers = await resolveContainers(src, perSource)
        const lists = await Promise.all(containers.map(c => fetchReplies(c, src.key)))
        return { key: src.key, containers, chats: lists.flat() }
      }

      const results = await Promise.all(active.map(fetchSource))

      let chats = results.flatMap(r => r.chats)
      chats.sort((a, b) => new Date(`${b.created}Z`) - new Date(`${a.created}Z`))
      chats = chats.slice(0, sourceKey === 'all' ? 60 : 80)

      // Compose target must be a source you can post into (a live container).
      // Read-only/tag sources (Hangs, D.Buzz) and "All" post to our BBH home.
      const homeKey = (sources.find(s => s.home) || sources[0] || {}).key
      const viewed = sources.find(s => s.key === sourceKey)
      const composeKey = (sourceKey !== 'all' && viewed && !viewed.readonly && viewed.scheme !== 'tag') ? sourceKey : homeKey

      let container = ((results.find(r => r.key === composeKey) || {}).containers || [])[0] || null
      if (!container) {
        const homeSrc = sources.find(s => s.key === composeKey)
        if (homeSrc && homeSrc.scheme !== 'tag') { container = (await resolveContainers(homeSrc, 1))[0] || null }
      }

      return { chats, container, composeKey }
    }

    const { data, pending, refresh } = await useAsyncData(
      'chats-feed',
      () => loadFeed(activeSource.value),
      { watch: [activeSource], default: () => ({ chats: [], container: null, composeKey: 'bbh' }) }
    )

    useHead({ title: 'Chats' })

    return { config, auth, sources, activeSource, data, pending, refresh, bridgeCall, fetchReplies }
  },

  data () {
    return {
      tab: 'latest',
      posting: false,
      localChats: [],
      pendingChats: [],
      pollTimer: null
    }
  },

  computed: {
    sourceTabs () {
      return [{ key: 'all', label: 'All' }, ...this.sources.map(s => ({ key: s.key, label: s.label }))]
    },

    container () {
      return this.data?.container || null
    },

    composeKey () {
      return this.data?.composeKey || 'bbh'
    },

    composeSource () {
      return this.sources.find(s => s.key === this.composeKey) || this.sources[0] || {}
    },

    composeLabel () {
      return this.composeSource.label || 'BBH Chats'
    },

    allChats () {
      const base = this.data?.chats || []
      const seen = new Set(base.map(c => `${c.author}/${c.permlink}`))
      const extra = this.localChats.filter(c => !seen.has(`${c.author}/${c.permlink}`))
      return [...extra, ...base]
    },

    sortedChats () {
      const list = [...this.allChats]
      if (this.tab === 'trending') {
        return list.sort((a, b) => this.score(b) - this.score(a))
      }
      return list.sort((a, b) => new Date(`${b.created}Z`) - new Date(`${a.created}Z`))
    },

    knownKeys () {
      const keys = new Set(this.allChats.map(c => `${c.author}/${c.permlink}`))
      this.pendingChats.forEach(c => keys.add(`${c.author}/${c.permlink}`))
      return keys
    }
  },

  mounted () {
    this.$eventBus.$on('comment-publish-successful', this.onPublished)
    this.$eventBus.$on('transaction-broadcast-error', this.onBroadcastError)

    if (!this.container) { this.refresh() }

    this.pollTimer = setInterval(this.pollNew, 30000)
  },

  beforeUnmount () {
    this.$eventBus.$off('comment-publish-successful', this.onPublished)
    this.$eventBus.$off('transaction-broadcast-error', this.onBroadcastError)
    if (this.pollTimer) { clearInterval(this.pollTimer) }
  },

  methods: {
    ...mapActions(usePostStore, ['requestBroadcastPost']),
    ...mapActions(useTribeStore, ['requestBroadcastOps']),

    sourceLabel (key) {
      if (!key || this.activeSource !== 'all') { return '' }
      const s = this.sources.find(x => x.key === key)
      return s ? s.label : ''
    },

    switchSource (key) {
      if (key === this.activeSource) { return }
      this.activeSource = key
      // Feed is source-specific — clear optimistic/pending buffers.
      this.localChats = []
      this.pendingChats = []
      this.tab = 'latest'
    },

    score (chat) {
      const rshares = parseFloat(chat.net_rshares || chat.vote_rshares || 0) || 0
      if (rshares > 0) { return rshares }
      const votes = (chat.active_votes || []).length
      const children = chat.children || 0
      return votes + children * 2
    },

    async pollNew () {
      if (!this.container) { return }

      try {
        const fresh = (await this.fetchReplies(this.container, this.composeKey))
          .filter(c => !this.knownKeys.has(`${c.author}/${c.permlink}`))

        if (fresh.length) {
          fresh.sort((a, b) => new Date(`${b.created}Z`) - new Date(`${a.created}Z`))
          this.pendingChats = [...fresh, ...this.pendingChats].slice(0, 50)
        }
      } catch { /* ignore transient poll failures */ }
    },

    onBroadcastError () {
      this.posting = false
    },

    showNew () {
      const have = new Set(this.localChats.map(c => `${c.author}/${c.permlink}`))
      const add = this.pendingChats.filter(c => !have.has(`${c.author}/${c.permlink}`))
      this.localChats = [...add, ...this.localChats]
      this.pendingChats = []
      if (import.meta.client) { window.scrollTo({ top: 0, behavior: 'smooth' }) }
    },

    async onComposerSubmit ({ body, images, video }) {
      if (this.posting) { return }

      if (!this.container) {
        await this.refresh()
        if (!this.container) {
          this.$notify({ title: 'Just a moment', type: 'warn', text: `Couldn't reach the ${this.composeLabel} container. Please refresh and try again.` })
          return
        }
      }

      // --- 3Speak short: publish as a comment on the container with the 3Speak
      // metadata + the mandatory beneficiaries, then bridge asset↔post. ---
      if (video && video.embedUrl) {
        this.posting = true
        const owner = this.auth.user.username
        const permlink = `bbh-short-${Date.now().toString(36)}`
        const caption = (body || '').trim()

        const finalBody = [
          video.embedUrl, '', caption, '', '---',
          `▶ [Watch on 3speak.tv](https://3speak.tv/shorts?v=${owner}/${permlink})`
        ].join('\n')

        const metadata = {
          app: '3speak/embed',
          format: 'markdown',
          tags: [...new Set([this.config.THREESPEAK_COMMUNITY, this.config.SCOT_TAG, this.composeSource.tag].filter(Boolean))].slice(0, 10),
          links: [video.embedUrl],
          video: {
            platform: '3speak', url: video.embedUrl, reusable: false,
            info: { platform: '3speak', author: owner, permlink: video.assetPermlink, title: '', duration: video.duration || 0 }
          }
        }
        const beneficiaries = (this.config.THREESPEAK_BENEFICIARIES || []).slice().sort((a, b) => a.account.localeCompare(b.account))

        this._pendingVideo = { permlink, assetPermlink: video.assetPermlink, body: finalBody }

        this.requestBroadcastOps({
          operations: [
            ['comment', { parent_author: this.container.author, parent_permlink: this.container.permlink, author: owner, permlink, title: '', body: finalBody, json_metadata: JSON.stringify(metadata) }],
            ['comment_options', { author: owner, permlink, max_accepted_payout: '1000000.000 HBD', percent_hbd: 10000, allow_votes: true, allow_curation_rewards: true, extensions: [[0, { beneficiaries }]] }]
          ],
          emitEvent: 'comment-publish-successful',
          emitData: { author: owner, permlink }
        })
        return
      }

      let finalBody = body
      if (images && images.length) {
        const md = images.map(u => `![](${u})`).join('\n')
        finalBody = finalBody ? `${finalBody}\n\n${md}` : md
      }
      if (!finalBody.trim()) { return }

      this.posting = true

      const permlink = `re-${this.container.author}-${Date.now().toString(36)}`
      const tags = [...new Set([this.composeSource.tag, this.config.SCOT_TAG].filter(Boolean))]

      const metadata = { tags, format: 'markdown', app: this.config.APP }
      if (images && images.length) { metadata.image = images }

      this.requestBroadcastPost({
        title: '',
        permlink,
        body: finalBody,
        parent_author: this.container.author,
        parent_permlink: this.container.permlink,
        metadata,
        payout_type: 'regular',
        beneficiaries: [],
        post_type: 'comment',
        edit: false
      })
    },

    onPublished (payload) {
      const isOurChat = this.container &&
        payload.parent_author === this.container.author &&
        payload.parent_permlink === this.container.permlink

      if (!isOurChat) { return }

      this.posting = false

      this.localChats.unshift({
        author: payload.author,
        permlink: payload.permlink,
        body: payload.body,
        parent_author: payload.parent_author,
        parent_permlink: payload.parent_permlink,
        created: new Date().toISOString().slice(0, 19),
        children: 0,
        net_rshares: 0,
        pending_payout_value: '0.000 HBD',
        author_reputation: 25,
        active_votes: [],
        json_metadata: payload.json_metadata || {},
        _source: this.composeKey
      })

      this.tab = 'latest'
      this.$refs.composer?.reset()

      // If this was a 3Speak short, bind the asset to the post so it appears in
      // 3Speak's feeds (and finishes encoding).
      if (this._pendingVideo && payload.permlink === this._pendingVideo.permlink) {
        const pv = this._pendingVideo
        this._pendingVideo = null
        $fetch('/api/v1/3speak/bridge', {
          method: 'POST',
          body: {
            permlink: pv.assetPermlink,
            hive_author: payload.author,
            hive_permlink: pv.permlink,
            hive_title: '',
            hive_body: pv.body,
            hive_tags: [this.config.THREESPEAK_COMMUNITY]
          }
        }).catch(() => {
          this.$notify({ title: 'Heads up', type: 'warn', text: 'Short posted, but linking to 3Speak failed — it may take a moment to appear.' })
        })
      }
    }
  }
}
</script>

<style scoped>
.chats-page { padding: 0 0 4rem; }

.chats-layout {
  max-width: 1080px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 1.6rem;
}
@media (min-width: 992px) {
  .chats-layout { grid-template-columns: minmax(0, 640px) 320px; justify-content: center; }
}

.chats-main {
  border-left: 1px solid var(--w3-border);
  border-right: 1px solid var(--w3-border);
  min-height: 80vh;
  position: relative;
}

.chats-header {
  padding: 1.7rem clamp(.9rem, 3vw, 1.4rem) 1.1rem;
  border-bottom: 1px solid var(--w3-border);
  background:
    radial-gradient(120% 120% at 0% 0%, rgba(245, 184, 0, .07), transparent 55%),
    radial-gradient(120% 120% at 100% 0%, rgba(224, 31, 38, .06), transparent 55%);
}
.chats-title {
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 700;
  font-size: 2rem;
  margin: 0;
  background: linear-gradient(135deg, var(--w3-gold), #ffd34d);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
.chats-sub { color: var(--w3-muted); margin: .2rem 0 0; font-size: .95rem; }

/* source selector */
.source-bar {
  display: flex;
  gap: .45rem;
  padding: .7rem clamp(.9rem, 3vw, 1.4rem);
  overflow-x: auto;
  border-bottom: 1px solid var(--w3-border);
  scrollbar-width: none;
}
.source-bar::-webkit-scrollbar { display: none; }
.source-pill {
  flex: 0 0 auto;
  border: 1px solid var(--w3-border);
  background: var(--w3-panel);
  color: var(--w3-muted);
  font-weight: 700;
  font-size: .85rem;
  padding: .35rem .9rem;
  border-radius: 999px;
  cursor: pointer;
  transition: all .15s ease;
}
.source-pill:hover { color: var(--w3-text); border-color: rgba(245, 184, 0, .4); }
.source-pill.active {
  color: #1a1206;
  background: linear-gradient(135deg, var(--w3-gold), #ffd34d);
  border-color: transparent;
  box-shadow: 0 0 16px rgba(245, 184, 0, .3);
}

.compose-hint {
  padding: .6rem clamp(.9rem, 3vw, 1.4rem) 0;
  font-size: .8rem;
  color: var(--w3-muted);
}
.compose-hint strong { color: var(--w3-gold); }

.chat-loginbar {
  padding: 1.1rem clamp(.9rem, 3vw, 1.4rem);
  border-bottom: 1px solid var(--w3-border);
  color: var(--w3-muted);
}
.chat-loginbar a { color: var(--w3-gold); font-weight: 600; }

/* sort tabs */
.chats-tabs {
  display: flex;
  position: sticky;
  top: 64px;
  z-index: 20;
  background: rgba(8, 8, 12, .82);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--w3-border);
}
.chats-tab {
  flex: 1;
  border: none;
  background: transparent;
  color: var(--w3-muted);
  font-weight: 700;
  font-size: .95rem;
  padding: .95rem 1rem;
  cursor: pointer;
  position: relative;
  transition: color .15s ease, background .15s ease;
}
.chats-tab:hover { color: var(--w3-text); background: var(--w3-panel); }
.chats-tab.active { color: var(--w3-gold); }
.chats-tab.active::after {
  content: '';
  position: absolute;
  bottom: 0; left: 50%; transform: translateX(-50%);
  width: 46px; height: 3px;
  border-radius: 3px 3px 0 0;
  background: linear-gradient(90deg, var(--w3-gold), #ffd34d);
}

/* new pill */
.new-pill {
  position: sticky;
  top: 118px;
  z-index: 25;
  display: block;
  margin: .8rem auto -0.2rem;
  border: none;
  border-radius: 999px;
  padding: .5rem 1.3rem;
  font-weight: 700;
  font-size: .88rem;
  color: #1a1206;
  background: linear-gradient(135deg, var(--w3-gold), #ffd34d);
  box-shadow: 0 6px 22px rgba(245, 184, 0, .4);
  cursor: pointer;
  transition: transform .15s ease;
}
.new-pill:hover { transform: translateY(-1px) scale(1.02); }

.chats-feed { min-height: 200px; }
.chats-empty { text-align: center; color: var(--w3-muted); padding: 3.5rem 1rem; }
.chats-empty-emoji { font-size: 2.6rem; margin-bottom: .6rem; }

/* transitions */
.pill-enter-active, .pill-leave-active { transition: all .25s ease; }
.pill-enter-from, .pill-leave-to { opacity: 0; transform: translateY(-8px); }

.chat-enter-active { transition: all .35s ease; }
.chat-enter-from { opacity: 0; transform: translateY(-12px); }

@media (max-width: 991px) {
  .chats-rail { display: none; }
  .chats-main { border-left: none; border-right: none; }
}
</style>
