<template>
  <article class="chat-card">
    <div class="chat-avatar">
      <nuxt-link :to="{ name: 'user', params: { user: chat.author } }">
        <b-avatar :src="`${config.IMAGES_CDN}u/${chat.author}/avatar`" variant="dark" size="44px" />
      </nuxt-link>
    </div>

    <div class="chat-main">
      <div class="chat-head">
        <author :author="chat.author" :reputation="chat.author_reputation" />
        <span class="chat-dot">·</span>
        <nuxt-link class="chat-time" :to="{ name: 'user-post', params: { user: chat.author, post: chat.permlink } }">
          <timeago :datetime="createdAt" :title="createdAt.toLocaleString()" :auto-update="60" />
        </nuxt-link>
      </div>

      <markdown-viewer class="chat-body" :text="chat.body" />

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
// plumbing as regular posts. Replies are fetched on demand (get_discussion on
// the Chat itself) and rendered through the recursive <comment> card — the
// bridge discussion map is normalised (authorperm + vote_rshares) so the
// legacy Comment/Votes props resolve.
import Author from '@/components/cards/Author.vue'
import Comment from '@/components/cards/Comment.vue'
import MarkdownViewer from '@/components/MarkdownViewer.vue'
import ReplyEditor from '@/components/ReplyEditor.vue'
import Votes from '@/components/Votes.vue'
import Loading from '@/components/Loading.vue'
import Timeago from '~/components/app/Timeago.vue'
import { useAuthStore } from '~/stores/auth'

export default {
  name: 'ChatCard',

  components: { Author, Comment, MarkdownViewer, ReplyEditor, Votes, Loading, Timeago },

  props: {
    chat: { type: Object, required: true }
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

    replyPermlinks () {
      const root = `${this.chat.author}/${this.chat.permlink}`
      const node = this.discussions[root]
      return (node && node.replies) ? node.replies : []
    }
  },

  mounted () {
    // A freshly-posted reply arrives via the event bus — refresh this thread.
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

          // Legacy Comment/Votes props expect these SCOT-era field names.
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
      // Only react if the reply belongs to this Chat's thread.
      if (!this.showReplies) { return }

      const inThread = data.parent_author === this.chat.author && data.parent_permlink === this.chat.permlink
      const nested = !!this.discussions[`${data.parent_author}/${data.parent_permlink}`]

      if (inThread || nested) {
        this.repliesLoaded = false
        // Give the node a moment to be indexed, then refetch.
        setTimeout(() => this.loadReplies(), 3000)
      }
    }
  }
}
</script>

<style scoped>
.chat-card {
  display: flex;
  gap: .85rem;
  padding: 1.1rem clamp(.9rem, 3vw, 1.4rem);
  border-bottom: 1px solid var(--w3-border);
  transition: background .15s ease;
}
.chat-card:hover { background: rgba(255, 255, 255, .015); }

.chat-avatar :deep(.b-avatar) { border: 2px solid var(--w3-border); }
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

.chat-body { word-break: break-word; }
.chat-body :deep(p:last-child) { margin-bottom: .4rem; }
.chat-body :deep(img) { max-width: 100%; border-radius: 12px; margin-top: .4rem; }

.chat-actions {
  display: flex;
  align-items: center;
  gap: 1.3rem;
  margin-top: .5rem;
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
.chat-payout { color: var(--w3-green, #2ecc71); font-weight: 700; }

.chat-reply-editor { margin-top: .8rem; }

.chat-replies {
  margin-top: .9rem;
  padding-left: .6rem;
  border-left: 2px solid var(--w3-border);
}
.chat-noreplies { color: var(--w3-muted); font-size: .85rem; margin: .3rem 0; }
</style>
