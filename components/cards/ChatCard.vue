<template>
  <article class="chat-card">
    <div class="chat-avatar">
      <nuxt-link :to="{ name: 'user', params: { user: chat.author } }">
        <b-avatar :src="`${config.IMAGES_CDN}u/${chat.author}/avatar`" variant="dark" size="46px" />
      </nuxt-link>
    </div>

    <div class="chat-main">
      <div class="chat-head">
        <author :author="chat.author" :reputation="chat.author_reputation" />
        <span class="chat-dot">·</span>
        <nuxt-link class="chat-time" :to="{ name: 'user-post', params: { user: chat.author, post: chat.permlink } }">
          <timeago :datetime="createdAt" :title="createdAt.toLocaleString()" :auto-update="60" />
        </nuxt-link>
        <span v-if="source" class="chat-source">{{ source }}</span>
      </div>

      <markdown-viewer v-if="displayBody" class="chat-body" :text="displayBody" />

      <chat-images v-if="bodyImages.length" :images="bodyImages" />

      <div class="chat-actions">
        <votes
          :author="chat.author"
          :permlink="chat.permlink"
          :active-votes="chat.active_votes || []"
          :rshares="rsharesNum"
          :payout="payoutNum"
          :is-comment="true"
        />

        <a class="chat-action" :class="{ active: showReplies }" @click.prevent="toggleReplies">
          <fa-icon icon="comment-alt" /> {{ chat.children || 0 }}
        </a>

        <a v-if="auth.loggedIn" class="chat-action" @click.prevent="showReplyEditor = !showReplyEditor">
          <fa-icon icon="reply" /> Reply
        </a>

        <span v-if="payoutNum > 0" class="chat-payout mono">${{ payoutNum.toFixed(2) }}</span>
      </div>

      <reply-editor
        v-if="showReplyEditor"
        class="chat-reply-editor"
        :parent-author="chat.author"
        :parent-permlink="chat.permlink"
        :cancel="true"
        :cancel-action="() => (showReplyEditor = false)"
      />

      <div v-if="showReplies" class="chat-replies">
        <loading v-if="loadingReplies" />
        <template v-else>
          <p v-if="replyPermlinks.length === 0" class="chat-noreplies">No replies yet.</p>
          <comment v-for="(permlink, i) of replyPermlinks" :key="i" :permlink="permlink" :discussions="discussions" />
        </template>
      </div>
    </div>
  </article>
</template>

<script>
// Short-form "Chat" item (Snaps/Threads/Waves-style). A Chat is a top-level
// comment on a container post; it reuses the same Votes/ReplyEditor/Comment
// plumbing as regular posts. Images are lifted out of the markdown into a
// Twitter-style grid; replies are fetched on demand (get_discussion on the
// Chat) and rendered through the recursive <comment> card — the bridge
// discussion map is normalised (authorperm + vote_rshares) so legacy props
// resolve.
import Author from '@/components/cards/Author.vue'
import Comment from '@/components/cards/Comment.vue'
import ChatImages from '@/components/cards/ChatImages.vue'
import MarkdownViewer from '@/components/MarkdownViewer.vue'
import ReplyEditor from '@/components/ReplyEditor.vue'
import Votes from '@/components/Votes.vue'
import Loading from '@/components/Loading.vue'
import Timeago from '~/components/app/Timeago.vue'
import { useAuthStore } from '~/stores/auth'

const IMG_MD = /!\[[^\]]*\]\((https?:\/\/[^\s)]+)\)/g
const IMG_HTML = /<img[^>]+src=["'](https?:\/\/[^"']+)["'][^>]*>/gi
const IMG_BARE = /(https?:\/\/[^\s)<>"']+\.(?:png|jpe?g|gif|webp)(?:\?[^\s)<>"']*)?)/gi

export default {
  name: 'ChatCard',

  components: { Author, Comment, ChatImages, MarkdownViewer, ReplyEditor, Votes, Loading, Timeago },

  props: {
    chat: { type: Object, required: true },
    source: { type: String, default: '' }
  },

  setup () {
    const config = useRuntimeConfig().public
    const auth = useAuthStore()
    const { $chain } = useNuxtApp()

    return { config, auth, $chain }
  },

  data () {
    return {
      showReplyEditor: false,
      showReplies: false,
      loadingReplies: false,
      discussions: {},
      repliesLoaded: false
    }
  },

  computed: {
    createdAt () {
      return new Date(`${this.chat.created}Z`)
    },

    payoutNum () {
      return parseFloat(this.chat.pending_payout_value || this.chat.payout || 0) || 0
    },

    rsharesNum () {
      return parseFloat(this.chat.net_rshares || this.chat.vote_rshares || 0) || 0
    },

    // Images = json_metadata.image plus any parsed from the body, deduped.
    bodyImages () {
      const set = []
      const meta = this.chat.json_metadata
      const metaImgs = meta && Array.isArray(meta.image) ? meta.image : []
      metaImgs.forEach(u => u && !set.includes(u) && set.push(u))

      const body = this.chat.body || ''
      let m
      const push = (u) => { if (u && !set.includes(u)) { set.push(u) } }
      IMG_MD.lastIndex = 0; while ((m = IMG_MD.exec(body))) { push(m[1]) }
      IMG_HTML.lastIndex = 0; while ((m = IMG_HTML.exec(body))) { push(m[1]) }
      IMG_BARE.lastIndex = 0; while ((m = IMG_BARE.exec(body))) { push(m[1]) }

      return set
    },

    // Body with image markdown/html/bare-url stripped (shown in the grid instead).
    displayBody () {
      let body = this.chat.body || ''
      body = body.replace(IMG_MD, '').replace(IMG_HTML, '')
      // Only strip bare image URLs that sit on their own line.
      body = body.replace(/^\s*https?:\/\/[^\s]+\.(?:png|jpe?g|gif|webp)(?:\?[^\s]*)?\s*$/gim, '')
      return body.replace(/\n{3,}/g, '\n\n').trim()
    },

    replyPermlinks () {
      const node = this.discussions[`${this.chat.author}/${this.chat.permlink}`]
      return (node && node.replies) ? node.replies : []
    }
  },

  mounted () {
    this.$eventBus.$on('comment-publish-successful', this.onReplyPublished)
  },

  beforeUnmount () {
    this.$eventBus.$off('comment-publish-successful', this.onReplyPublished)
  },

  methods: {
    async toggleReplies () {
      this.showReplies = !this.showReplies

      if (this.showReplies && !this.repliesLoaded && (this.chat.children || 0) > 0) {
        await this.loadReplies()
      }
    },

    async loadReplies () {
      this.loadingReplies = true

      try {
        const client = this.$chain.getClient()
        const raw = await client.hivemind.call('get_discussion', {
          author: this.chat.author,
          permlink: this.chat.permlink
        })

        const map = {}

        for (const key of Object.keys(raw || {})) {
          const node = raw[key]

          if (typeof node.json_metadata === 'string') {
            try { node.json_metadata = JSON.parse(node.json_metadata) } catch { node.json_metadata = {} }
          }
          if (!node.json_metadata) { node.json_metadata = {} }

          node.authorperm = key
          node.vote_rshares = parseFloat(node.net_rshares || 0) || 0
          node.replies = node.replies || []

          map[key] = node
        }

        this.discussions = map
        this.repliesLoaded = true
      } catch (e) {
        this.$notify({ title: 'Error', type: 'error', text: 'Could not load replies.' })
      } finally {
        this.loadingReplies = false
      }
    },

    onReplyPublished (data) {
      if (!this.showReplies) { return }

      const inThread = data.parent_author === this.chat.author && data.parent_permlink === this.chat.permlink
      const nested = !!this.discussions[`${data.parent_author}/${data.parent_permlink}`]

      if (inThread || nested) {
        this.repliesLoaded = false
        setTimeout(() => this.loadReplies(), 3000)
      }
    }
  }
}
</script>

<style scoped>
.chat-card {
  display: flex;
  gap: .9rem;
  padding: 1.15rem clamp(.9rem, 3vw, 1.4rem);
  border-bottom: 1px solid var(--w3-border);
  transition: background .15s ease;
}
.chat-card:hover { background: rgba(255, 255, 255, .022); }

.chat-avatar :deep(.b-avatar) { border: 2px solid var(--w3-border); transition: border-color .15s ease; }
.chat-card:hover .chat-avatar :deep(.b-avatar) { border-color: rgba(245, 184, 0, .45); }
.chat-main { flex: 1; min-width: 0; }

.chat-head {
  display: flex;
  align-items: center;
  gap: .4rem;
  flex-wrap: wrap;
  margin-bottom: .3rem;
}
.chat-dot { color: var(--w3-muted); }
.chat-time { color: var(--w3-muted); font-size: .85rem; text-decoration: none; }
.chat-time:hover { color: var(--w3-text); }
.chat-source {
  margin-left: auto;
  font-size: .68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .04em;
  color: var(--w3-muted);
  border: 1px solid var(--w3-border);
  border-radius: 999px;
  padding: .1rem .5rem;
}

.chat-body { word-break: break-word; font-size: 1.02rem; }
.chat-body :deep(p:last-child) { margin-bottom: 0; }
.chat-body :deep(img) { max-width: 100%; border-radius: 12px; }

.chat-actions {
  display: flex;
  align-items: center;
  gap: 1.4rem;
  margin-top: .7rem;
  font-size: .9rem;
  font-weight: 600;
}
.chat-action {
  color: var(--w3-muted);
  cursor: pointer;
  text-decoration: none;
  transition: color .15s ease;
}
.chat-action:hover, .chat-action.active { color: var(--w3-gold); }
.chat-payout { color: #2ecc71; font-weight: 700; }

.chat-reply-editor { margin-top: .8rem; }

.chat-replies {
  margin-top: .9rem;
  padding-left: .7rem;
  border-left: 2px solid var(--w3-border);
}
.chat-noreplies { color: var(--w3-muted); font-size: .85rem; margin: .3rem 0; }
</style>
