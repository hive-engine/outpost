<template>
  <div class="chats-page">
    <div class="chats-header">
      <h1 class="chats-title">Chats</h1>
      <p class="chats-sub">Short-form posts from the community. Say something.</p>
    </div>

    <!-- composer -->
    <div v-if="auth.loggedIn" class="chat-composer">
      <b-avatar :src="`${config.IMAGES_CDN}u/${auth.user.username}/avatar`" variant="dark" size="44px" />

      <div class="composer-main">
        <textarea
          ref="composer"
          v-model="draft"
          class="composer-input"
          rows="2"
          maxlength="8000"
          placeholder="What's happening?"
          @input="autogrow"
        />

        <div class="composer-bar">
          <span class="composer-hint">Markdown &amp; image links supported</span>
          <div class="composer-right">
            <span class="composer-count" :class="{ over: draft.length > 480 }">{{ draft.length }}</span>
            <b-button variant="primary" size="sm" :disabled="!canPost || posting" @click.prevent="postChat">
              <fa-icon v-if="posting" icon="circle-notch" class="fa-spin" />
              <template v-else>Chat</template>
            </b-button>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="chat-loginbar">
      <nuxt-link :to="{ name: 'login' }">Log in</nuxt-link> to join the conversation.
    </div>

    <!-- timeline -->
    <div class="chats-feed">
      <loading v-if="pending" />

      <template v-else-if="chats.length">
        <chat-card v-for="chat of chats" :key="`${chat.author}/${chat.permlink}`" :chat="chat" />
      </template>

      <div v-else class="chats-empty">
        <p>No chats yet. Be the first!</p>
      </div>
    </div>
  </div>
</template>

<script>
// Short-form "Chats" feed. Chats are top-level comments on rolling container
// posts published by CHATS_ACCOUNT (the account's newest post is the active
// container). We aggregate the direct replies of the most-recent N containers
// into a single reverse-chronological timeline, and compose by posting a
// comment onto the newest container. Reuses ChatCard/Votes/ReplyEditor.
import { mapActions } from 'pinia'
import ChatCard from '@/components/cards/ChatCard.vue'
import Loading from '@/components/Loading.vue'
import { usePostStore } from '~/stores/post'
import { useAuthStore } from '~/stores/auth'

export default {
  name: 'ChatsPage',

  components: { ChatCard, Loading },

  async setup () {
    const config = useRuntimeConfig().public
    const auth = useAuthStore()
    const { $chain } = useNuxtApp()

    const account = config.CHATS_ACCOUNT
    const containersToLoad = Number(config.CHATS_CONTAINERS_TO_LOAD) || 3
    const prefix = config.CHATS_CONTAINER_PREFIX || ''

    const { data, pending, refresh } = await useAsyncData(`chats-${account}`, async () => {
      const client = $chain.getClient()

      // 1. The account's recent posts ARE the containers (newest first). When a
      // prefix is configured (shared account) keep only permlinks matching it, so
      // the account's normal blog posts are never treated as containers.
      const recent = await client.hivemind.call('get_account_posts', {
        sort: 'posts',
        account,
        limit: prefix ? 30 : containersToLoad
      })

      const containers = (Array.isArray(recent) ? recent : [])
        .filter(p => !prefix || p.permlink.startsWith(prefix))
        .slice(0, containersToLoad)

      if (containers.length === 0) {
        return { chats: [], container: null }
      }

      // 2. Fetch each container's discussion; keep the direct children (= chats).
      const discussions = await Promise.all(
        containers.map(c => client.hivemind
          .call('get_discussion', { author: c.author, permlink: c.permlink })
          .catch(() => ({}))
        )
      )

      const chats = []

      discussions.forEach((raw, ci) => {
        const container = containers[ci]

        Object.values(raw || {}).forEach((node) => {
          if (node.parent_author === container.author && node.parent_permlink === container.permlink) {
            if (typeof node.json_metadata === 'string') {
              try { node.json_metadata = JSON.parse(node.json_metadata) } catch { node.json_metadata = {} }
            }
            chats.push(node)
          }
        })
      })

      // 3. Newest first.
      chats.sort((a, b) => new Date(`${b.created}Z`) - new Date(`${a.created}Z`))

      // Trim outgoing container body (large) to keep the payload light.
      const container = { author: containers[0].author, permlink: containers[0].permlink }

      return { chats, container }
    }, { default: () => ({ chats: [], container: null }) })

    useHead({ title: 'Chats' })

    return { config, auth, data, pending, refresh, account }
  },

  data () {
    return {
      draft: '',
      posting: false,
      localChats: []
    }
  },

  computed: {
    chats () {
      const base = this.data?.chats || []
      // Prepend optimistically-added local chats (dedupe by permlink).
      const seen = new Set(base.map(c => `${c.author}/${c.permlink}`))
      const extra = this.localChats.filter(c => !seen.has(`${c.author}/${c.permlink}`))
      return [...extra, ...base]
    },

    container () {
      return this.data?.container || null
    },

    canPost () {
      return this.draft.trim().length > 0 && !!this.container
    }
  },

  mounted () {
    this.$eventBus.$on('comment-publish-successful', this.onPublished)
  },

  beforeUnmount () {
    this.$eventBus.$off('comment-publish-successful', this.onPublished)
  },

  methods: {
    ...mapActions(usePostStore, ['requestBroadcastPost']),

    autogrow () {
      const el = this.$refs.composer
      if (!el) { return }
      el.style.height = 'auto'
      el.style.height = `${Math.min(el.scrollHeight, 320)}px`
    },

    extractImages (body) {
      const urls = []
      const md = /!\[[^\]]*\]\((https?:\/\/[^\s)]+)\)/g
      const bare = /(https?:\/\/[^\s)]+\.(?:png|jpe?g|gif|webp))/gi
      let m
      while ((m = md.exec(body)) !== null) { urls.push(m[1]) }
      while ((m = bare.exec(body)) !== null) { if (!urls.includes(m[1])) { urls.push(m[1]) } }
      return urls
    },

    postChat () {
      if (!this.canPost || this.posting) { return }

      const body = this.draft.trim()
      this.posting = true

      const permlink = `re-${this.container.author}-${Date.now().toString(36)}`

      const metadata = {
        tags: [this.config.CHATS_TAG, this.config.SCOT_TAG].filter(Boolean),
        format: 'markdown'
      }

      const images = this.extractImages(body)
      if (images.length) { metadata.image = images }

      this.requestBroadcastPost({
        title: '',
        permlink,
        body,
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
      // Reset the "posting" state once our own container-level chat lands.
      const isOurChat = this.container &&
        payload.parent_author === this.container.author &&
        payload.parent_permlink === this.container.permlink

      if (!isOurChat) { return }

      this.posting = false

      // Optimistically show it at the top of the feed.
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

      this.draft = ''
      this.$nextTick(this.autogrow)
    }
  }
}
</script>

<style scoped>
.chats-page {
  max-width: 640px;
  margin: 0 auto;
  padding: 0 0 4rem;
}

.chats-header {
  padding: 1.6rem clamp(.9rem, 3vw, 1.4rem) 1rem;
}
.chats-title {
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 700;
  font-size: 1.9rem;
  margin: 0;
  background: linear-gradient(135deg, var(--w3-gold), #ffd34d);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
.chats-sub { color: var(--w3-muted); margin: .2rem 0 0; font-size: .95rem; }

/* composer */
.chat-composer {
  display: flex;
  gap: .85rem;
  padding: 1rem clamp(.9rem, 3vw, 1.4rem);
  border-top: 1px solid var(--w3-border);
  border-bottom: 1px solid var(--w3-border);
  background: rgba(255, 255, 255, .015);
}
.composer-main { flex: 1; min-width: 0; }
.composer-input {
  width: 100%;
  background: transparent;
  border: none;
  outline: none;
  resize: none;
  color: var(--w3-text);
  font-size: 1.15rem;
  line-height: 1.5;
  padding: .35rem 0;
}
.composer-input::placeholder { color: var(--w3-muted); }
.composer-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-top: 1px solid var(--w3-border);
  padding-top: .6rem;
  margin-top: .3rem;
}
.composer-hint { color: var(--w3-muted); font-size: .78rem; }
.composer-right { display: flex; align-items: center; gap: .8rem; }
.composer-count { color: var(--w3-muted); font-size: .85rem; font-variant-numeric: tabular-nums; }
.composer-count.over { color: var(--w3-gold); }

.chat-loginbar {
  padding: 1.1rem clamp(.9rem, 3vw, 1.4rem);
  border-top: 1px solid var(--w3-border);
  border-bottom: 1px solid var(--w3-border);
  color: var(--w3-muted);
}
.chat-loginbar a { color: var(--w3-gold); font-weight: 600; }

.chats-feed { min-height: 200px; }
.chats-empty { text-align: center; color: var(--w3-muted); padding: 3rem 1rem; }
</style>
