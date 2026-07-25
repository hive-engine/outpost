<template>
  <div class="chats-page">
    <div class="chats-layout">
      <!-- main column -->
      <div class="chats-main">
        <div class="chats-header">
          <h1 class="chats-title">Chats</h1>
          <p class="chats-sub">Short-form posts from the community. Say something.</p>
        </div>

        <!-- composer -->
        <chat-composer v-if="auth.loggedIn" ref="composer" :posting="posting" @submit="onComposerSubmit" />
        <div v-else class="chat-loginbar">
          <nuxt-link :to="{ name: 'login' }">Log in</nuxt-link> to join the conversation.
        </div>

        <!-- tabs -->
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
              <chat-card v-for="chat of sortedChats" :key="`${chat.author}/${chat.permlink}`" :chat="chat" />
            </transition-group>
          </template>

          <div v-else class="chats-empty">
            <div class="chats-empty-emoji">💬</div>
            <p>No chats yet. Be the first!</p>
          </div>
        </div>
      </div>

      <!-- side rail -->
      <chats-sidebar class="chats-rail" />
    </div>
  </div>
</template>

<script>
// Short-form "Chats" feed. Chats are top-level comments on rolling container
// posts published by CHATS_ACCOUNT (the account's newest matching post is the
// active container). We aggregate the direct replies of the most-recent N
// containers into one timeline, support Latest/Trending sorting, poll the live
// container for new chats (Twitter-style "N new" pill), and compose by posting
// a comment onto the newest container. Reuses ChatComposer/ChatCard/Sidebar.
import { mapActions } from 'pinia'
import ChatCard from '@/components/cards/ChatCard.vue'
import ChatComposer from '@/components/cards/ChatComposer.vue'
import ChatsSidebar from '@/components/cards/ChatsSidebar.vue'
import Loading from '@/components/Loading.vue'
import { usePostStore } from '~/stores/post'
import { useAuthStore } from '~/stores/auth'

export default {
  name: 'ChatsPage',

  components: { ChatCard, ChatComposer, ChatsSidebar, Loading },

  async setup () {
    const config = useRuntimeConfig().public
    const auth = useAuthStore()
    const { $chain } = useNuxtApp()

    const account = config.CHATS_ACCOUNT
    const containersToLoad = Number(config.CHATS_CONTAINERS_TO_LOAD) || 3
    const prefix = config.CHATS_CONTAINER_PREFIX || ''

    const fetchDirectChildren = async (client, container) => {
      const raw = await client.hivemind
        .call('get_discussion', { author: container.author, permlink: container.permlink })
        .catch(() => ({}))

      const out = []
      Object.values(raw || {}).forEach((node) => {
        if (node.parent_author === container.author && node.parent_permlink === container.permlink) {
          if (typeof node.json_metadata === 'string') {
            try { node.json_metadata = JSON.parse(node.json_metadata) } catch { node.json_metadata = {} }
          }
          out.push(node)
        }
      })
      return out
    }

    // Container candidates. When a prefix is set (BBH) we derive the permlinks
    // DETERMINISTICALLY from the date scheme (`${prefix}YYYY-MM-DD`, UTC) and
    // resolve them via get_discussion — which is reliable, unlike
    // bridge.get_account_posts, whose dhive routing errors intermittently by node
    // (that flakiness is what made the compose target null and the button dead).
    const buildCandidates = async (client) => {
      if (prefix) {
        const now = new Date()
        const out = []
        for (let i = 0; i < containersToLoad; i++) {
          const d = new Date(now)
          d.setUTCDate(now.getUTCDate() - i)
          out.push({ author: account, permlink: `${prefix}${d.toISOString().slice(0, 10)}` })
        }
        return out
      }
      // No prefix (demo/generic): best-effort account posts as containers.
      try {
        const recent = await client.hivemind.call('get_account_posts', { sort: 'posts', account, limit: containersToLoad })
        return (Array.isArray(recent) ? recent : []).slice(0, containersToLoad).map(p => ({ author: p.author, permlink: p.permlink }))
      } catch {
        return []
      }
    }

    const { data, pending, refresh } = await useAsyncData(`chats-${account}`, async () => {
      const client = $chain.getClient()
      const candidates = await buildCandidates(client)

      if (candidates.length === 0) {
        return { chats: [], container: null }
      }

      // Resolve each candidate via get_discussion; keep the ones that exist on-chain.
      const results = await Promise.all(candidates.map(async (c) => {
        const raw = await client.hivemind
          .call('get_discussion', { author: c.author, permlink: c.permlink })
          .catch(() => null)

        const exists = !!(raw && raw[`${c.author}/${c.permlink}`])
        const children = []

        if (exists) {
          Object.values(raw).forEach((node) => {
            if (node.parent_author === c.author && node.parent_permlink === c.permlink) {
              if (typeof node.json_metadata === 'string') {
                try { node.json_metadata = JSON.parse(node.json_metadata) } catch { node.json_metadata = {} }
              }
              children.push(node)
            }
          })
        }

        return { container: c, exists, children }
      }))

      const existing = results.filter(r => r.exists)
      const chats = existing.flatMap(r => r.children)

      chats.sort((a, b) => new Date(`${b.created}Z`) - new Date(`${a.created}Z`))

      // Compose target = newest existing container (candidates are today-first).
      const container = existing[0]?.container || null

      return { chats, container }
    }, { default: () => ({ chats: [], container: null }) })

    useHead({ title: 'Chats' })

    return { config, auth, data, pending, refresh, account, fetchDirectChildren, $chain }
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
    container () {
      return this.data?.container || null
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
    // Reset the posting state if the broadcast fails or the user cancels Keychain.
    this.$eventBus.$on('transaction-broadcast-error', this.onBroadcastError)

    // If the container didn't resolve during SSR (transient RPC hiccup), retry
    // once on the client so the composer has a valid target.
    if (!this.container) { this.refresh() }

    // Poll the live container for fresh chats (client-only).
    this.pollTimer = setInterval(this.pollNew, 30000)
  },

  beforeUnmount () {
    this.$eventBus.$off('comment-publish-successful', this.onPublished)
    this.$eventBus.$off('transaction-broadcast-error', this.onBroadcastError)
    if (this.pollTimer) { clearInterval(this.pollTimer) }
  },

  methods: {
    ...mapActions(usePostStore, ['requestBroadcastPost']),

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
        const client = this.$chain.getClient()
        const children = await this.fetchDirectChildren(client, this.container)

        const fresh = children.filter(c => !this.knownKeys.has(`${c.author}/${c.permlink}`))
        if (fresh.length) {
          // newest first, cap the buffer
          fresh.sort((a, b) => new Date(`${b.created}Z`) - new Date(`${a.created}Z`))
          this.pendingChats = [...fresh, ...this.pendingChats].slice(0, 50)
        }
      } catch {
        // ignore transient poll failures
      }
    },

    onBroadcastError () {
      this.posting = false
    },

    showNew () {
      // Move pending into the live feed (dedupe against our own optimistic ones).
      const have = new Set(this.localChats.map(c => `${c.author}/${c.permlink}`))
      const add = this.pendingChats.filter(c => !have.has(`${c.author}/${c.permlink}`))
      this.localChats = [...add, ...this.localChats]
      this.pendingChats = []
      if (import.meta.client) { window.scrollTo({ top: 0, behavior: 'smooth' }) }
    },

    async onComposerSubmit ({ body, images }) {
      if (this.posting) { return }

      // Container must be resolved to post into. If it's missing (rare — RPC
      // hiccup or the daily container not created yet), retry once, then tell the
      // user instead of failing silently.
      if (!this.container) {
        await this.refresh()
        if (!this.container) {
          this.$notify({ title: 'Just a moment', type: 'warn', text: "Couldn't reach today's Chats container. Please refresh and try again." })
          return
        }
      }

      let finalBody = body
      if (images && images.length) {
        const md = images.map(u => `![](${u})`).join('\n')
        finalBody = finalBody ? `${finalBody}\n\n${md}` : md
      }
      if (!finalBody.trim()) { return }

      this.posting = true

      const permlink = `re-${this.container.author}-${Date.now().toString(36)}`

      const metadata = {
        tags: [this.config.CHATS_TAG, this.config.SCOT_TAG].filter(Boolean),
        format: 'markdown'
      }
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
        json_metadata: payload.json_metadata || {}
      })

      this.tab = 'latest'
      this.$refs.composer?.reset()
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

.chat-loginbar {
  padding: 1.1rem clamp(.9rem, 3vw, 1.4rem);
  border-bottom: 1px solid var(--w3-border);
  color: var(--w3-muted);
}
.chat-loginbar a { color: var(--w3-gold); font-weight: 600; }

/* tabs */
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
