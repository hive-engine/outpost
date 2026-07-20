<template>
  <div class="post-page">
    <article class="post-article">
      <NuxtLink class="post-back" to="/">← Back to the feed</NuxtLink>

      <header class="post-header">
        <NuxtLink v-if="community.tag" class="post-community" :to="{ name: 'sort-tag', params: { sort: 'trending', tag: community.tag } }">
          ◈ {{ community.title }}
        </NuxtLink>

        <h1 class="post-title">{{ post.title }}</h1>

        <div class="post-byline">
          <b-avatar :src="`${config.IMAGES_CDN}u/${post.author}/avatar`" variant="dark" size="46px" />
          <div class="post-byline-main">
            <author :author="post.author" :reputation="post.author_reputation" />
            <div class="post-byline-meta">
              <timeago :datetime="createdAt" :title="createdAt.toLocaleString()" :auto-update="60" />
              <template v-if="createdAt.getTime() !== updatedAt.getTime()">
                · <span v-b-tooltip.hover :title="updatedAt.toLocaleString()">Edited</span>
              </template>
              <template v-if="postAuthor !== post.author">
                · Authored by <nuxt-link :to="{ name: 'user', params: { user: postAuthor } }">@{{ postAuthor }}</nuxt-link>
              </template>
            </div>
          </div>
          <div class="post-reward mono"><payout :post="post" /></div>
        </div>
      </header>

      <div v-if="post.depth >= 1" class="post-notice">
        <p class="fw-bold mb-2">You're viewing a single comment's thread:</p>
        <nuxt-link :to="post.url">View full context</nuxt-link> ·
        <nuxt-link :to="{ name: 'user-post', params: { user: post.parent_author, post: post.parent_permlink } }">View direct parent</nuxt-link>
      </div>

      <markdown-viewer class="post-body markdown-view" :text="post.body" />

      <div v-if="post.json_metadata.tags" class="post-tags">
        <nuxt-link v-for="(tag, i) of post.json_metadata.tags" :key="i" class="post-tag" :to="{ name: 'sort-tag', params: { sort: 'trending', tag } }">
          #{{ tag }}
        </nuxt-link>
      </div>

      <!-- glowing action bar -->
      <div class="post-actions">
        <div class="post-actions-left">
          <votes
            :author="post.author"
            :permlink="post.permlink"
            :active-votes="post.active_votes"
            :rshares="post.vote_rshares"
            :payout="post.pending_token || post.total_payout_value"
            :is-comment="false"
          />
          <extra-actions :post="post" />
        </div>
        <a href="#comments" class="post-actions-comments">💬 {{ Object.keys(discussions).length - 1 }}</a>
      </div>

      <section class="post-reply">
        <h3 class="post-h3">Add a comment</h3>
        <reply-editor :parent-author="post.author" :parent-permlink="post.permlink" :autofocus="false" />
      </section>

      <section id="comments" class="post-comments">
        <div class="post-comments-head">
          <h3 class="post-h3">{{ Object.keys(discussions).length - 1 }} comments</h3>

          <b-dropdown variant="link" lazy end size="sm">
            <template #button-content>
              <fa-icon icon="sort-amount-down" /> {{ sortOptions[sortBy] }}
            </template>
            <b-dropdown-item v-for="(option, i) of Object.keys(sortOptions)" :key="i" @click.prevent="sortBy = option">
              {{ sortOptions[option] }}
            </b-dropdown-item>
          </b-dropdown>
        </div>

        <div class="post-comments-list">
          <div v-for="(permlink, i) of post.replies" :key="i">
            <comment :permlink="permlink" :discussions="discussions" />
          </div>
        </div>
      </section>
    </article>
  </div>
</template>

<script>
// Ported from legacy/pages/post.vue (legacy route name 'user-post', path /@:user/:post).
// asyncData({ $chain, $auth, route, error }) -> async setup() + useAsyncData;
// error(...) -> throw createError; fetchOnServer:false fetch() -> client fetch in mounted();
// head() -> useHead(); Vuex scot/user actions -> Pinia mapActions; $config -> config,
// $auth -> auth (setup). <timeago> -> local Timeago drop-in. BS5 renames applied.
import { mapActions } from 'pinia'
import { proxifyImageUrl } from '@/utils/proxify-url'
import { extractImageLink, extractBodySummary, extractCanonicalLink } from '@/utils/extract-content'
import Author from '@/components/cards/Author.vue'
import Comment from '@/components/cards/Comment.vue'
import MarkdownViewer from '@/components/MarkdownViewer.vue'
import ReplyEditor from '@/components/ReplyEditor.vue'
import ExtraActions from '@/components/ExtraActions.vue'
import Votes from '@/components/Votes.vue'
import Payout from '@/components/Payout.vue'
import Timeago from '~/components/app/Timeago.vue'
import { useAuthStore } from '~/stores/auth'
import { useScotStore } from '~/stores/scot'
import { useUserStore } from '~/stores/user'

export default {
  name: 'SinglePostPage',

  components: {
    Author,
    Comment,
    MarkdownViewer,
    ReplyEditor,
    ExtraActions,
    Votes,
    Payout,
    Timeago
  },

  async setup () {
    definePageMeta({ name: 'user-post' })

    const config = useRuntimeConfig().public
    const auth = useAuthStore()
    const route = useRoute()
    const { $chain } = useNuxtApp()

    // useAsyncData must RETURN the discussions (not set a ref as a side effect):
    // the returned value is serialized to the client, so on hydration the callback
    // does NOT re-run and any side-effect ref would stay empty -> the 404 guard would
    // wrongly fire client-side. Returning the data keeps it available on both sides.
    const { data } = await useAsyncData(`post-${route.params.user}-${route.params.post}`, async () => {
      try {
        const client = $chain.getClient()

        const { user: author, post: permlink } = route.params

        const params = { author, permlink }

        if (auth.loggedIn) {
          params.observer = auth.user.username
        }

        const d = await client.hivemind.call('get_discussion', params)

        Object.keys(d).forEach((pl) => {
          d[pl] = {
            ...d[pl],
            pending_token: 0,
            vote_rshares: 0,
            total_payout_value: 0,
            estimated_payout_value: 0
          }
        })

        return d
      } catch (e) {
        return null
      }
    })

    const discussions = computed(() => data.value || {})
    const permlinks = computed(() => Object.keys(data.value || {}))

    // Validate at setup level (throw here aborts to a proper 404, whereas a throw
    // inside the useAsyncData callback is only captured). Covers fetch failures and
    // get_discussion succeeding without the requested post (comment permlinks/quirks).
    if (!discussions.value[`${route.params.user}/${route.params.post}`]) {
      throw createError({ statusCode: 404, statusMessage: 'Content was not found!' })
    }

    const currentPost = computed(() => {
      const { user: author, post: permlink } = route.params
      return discussions.value[`${author}/${permlink}`] || {}
    })

    useHead(() => {
      const p = currentPost.value

      if (!p || !p.body) { return {} }

      const link = []

      const description = extractBodySummary(p.body)
      let thumbnail = extractImageLink(p.json_metadata, p.body)
      const canonicalLink = extractCanonicalLink(p.json_metadata, p.category, p.author, p.permlink)

      const meta = [
        { key: 'description', name: 'description', content: description },
        { key: 'og-type', property: 'og:type', content: 'article' },
        { key: 'og-title', property: 'og:title', content: p.title },
        { key: 'og-description', property: 'og:description', content: description },

        { key: 'twitter-card', name: 'twitter:card', content: 'summary_large_image' },
        { key: 'twitter-title', name: 'twitter:title', content: p.title },
        { key: 'twitter-description', name: 'twitter:description', content: description }
      ]

      if (thumbnail) {
        thumbnail = proxifyImageUrl(thumbnail, '1200x630')

        meta.push({ key: 'og-image', property: 'og:image', content: thumbnail })
        meta.push({ key: 'twitter-image', name: 'twitter:image', content: thumbnail })
      }

      if (canonicalLink) {
        link.push({ key: 'canonical', rel: 'canonical', href: canonicalLink })
      }

      return {
        title: p.title,
        meta,
        link
      }
    })

    return { config, auth, discussions, permlinks }
  },

  data () {
    return {
      loading: false,
      sortBy: '',
      sortOptions: {
        reward: 'Reward',
        newest: 'Newest',
        oldest: 'Oldest',
        reputation: 'Reputation'
      }
    }
  },

  computed: {
    post () {
      const { user: author, post: permlink } = this.$route.params

      return this.discussions[`${author}/${permlink}`]
    },

    community () {
      let { community: tag, community_title: title } = this.post

      if (!tag) {
        try {
          tag = this.post.json_metadata.tags[0]
          title = tag
        } catch {

        }
      }

      return {
        tag,
        title
      }
    },

    postAuthor () {
      return (this.post.json_metadata.author) ? this.post.json_metadata.author : this.post.author
    },

    createdAt () {
      return new Date(`${this.post.created}Z`)
    },

    updatedAt () {
      return new Date(`${this.post.updated}Z`)
    }
  },

  watch: {
    sortBy (key) {
      const replies = Object.values(this.discussions).filter(c => c.parent_author === this.post.author && c.parent_permlink === this.post.permlink)

      replies.sort((a, b) => {
        if (key === 'oldest' || key === 'newest') {
          const createdA = new Date(a.created).getTime()
          const createdB = new Date(b.created).getTime()

          if (key === 'oldest') {
            return createdA - createdB
          }

          return createdB - createdA
        } else if (key === 'reputation') {
          return b.author_reputation - a.author_reputation
        }

        return b.net_rshares - a.net_rshares
      })

      this.post.replies = replies.map(p => `${p.author}/${p.permlink}`)
    }
  },

  async mounted () {
    // Legacy fetchOnServer:false fetch() -> client-only thread fetch on mount.
    this.sortBy = 'reward'

    const { user: author, post: permlink } = this.$route.params

    const scotData = await this.fetchThread({ author, permlink })

    scotData.forEach((d) => {
      const authorperm = d.authorperm.substring(1)

      delete d.json_metadata

      this.discussions[authorperm] = {
        ...this.discussions[authorperm],
        ...d
      }
    })

    this.$eventBus.$on(['upvote-successful', 'downvote-successful', 'unvote-successful'], this.onVote)

    this.$eventBus.$on(['comment-publish-successful', 'comment-edit-successful'], this.onComment)

    this.$eventBus.$on(['post-delete-successful', 'comment-delete-successful'], this.onDelete)
  },

  beforeUnmount () {
    this.$eventBus.$off(['upvote-successful', 'downvote-successful', 'unvote-successful'], this.onVote)

    this.$eventBus.$off(['comment-publish-successful', 'comment-edit-successful'], this.onComment)

    this.$eventBus.$off(['post-delete-successful', 'comment-delete-successful'], this.onDelete)
  },

  methods: {
    ...mapActions(useScotStore, ['fetchPost', 'fetchThread']),
    ...mapActions(useUserStore, ['fetchAccountScotData']),

    sleep (ms) {
      return new Promise(resolve => setTimeout(resolve, ms))
    },

    async onVote ({ type, author, permlink, weight }) {
      await this.sleep(30 * 1000)

      const [content] = await Promise.all([
        this.fetchPost({ author, permlink }),
        this.fetchAccountScotData()
      ])

      if (content) {
        const authorperm = content.authorperm.substring(1)

        delete content.json_metadata

        const newData = {
          ...this.discussions[authorperm],
          ...content
        }

        this.discussions[authorperm] = newData
      }

      this.$eventBus.$emit('vote-acknowledgement', { type, author, permlink, weight })
    },

    onComment (data) {
      const content = {
        ...data,
        created: new Date().toISOString().replace(/\dZ/, ''),
        updated: new Date().toISOString().replace(/\dZ/, ''),
        cashout_time: new Date().toISOString().replace(/\dZ/, ''),
        replies: [],
        token: this.config.TOKEN,
        vote_rshares: 0,
        active_votes: [],
        pending_token: 0,
        total_payout_value: 0,
        estimated_payout_value: 0,
        curator_payout_value: 0
      }

      const authorperm = `${data.author}/${data.permlink}`

      if (!data.edit) {
        this.discussions[authorperm] = content
        this.discussions[`${data.parent_author}/${data.parent_permlink}`].replies.push(authorperm)
      } else {
        this.discussions[authorperm] = {
          ...this.discussions[authorperm],
          updated: new Date().toISOString().replace(/\dZ/, ''),
          body: data.body
        }
      }
    },

    async onDelete ({ author, permlink, type }) {
      if (type === 'post' && this.post.author === author && this.post.permlink === permlink) {
        this.loading = true

        await this.sleep(30 * 1000)

        this.$router.push({ name: 'user', params: { user: author } })
      }

      if (type === 'comment') {
        const authorperm = `${author}/${permlink}`

        const parent = this.discussions[`${this.discussions[authorperm].parent_author}/${this.discussions[authorperm].parent_permlink}`]

        parent.replies = parent.replies.filter(r => r !== authorperm)

        delete this.discussions[authorperm]
      }
    }
  }
}
</script>

<style scoped>
.post-page { max-width: 760px; margin: 0 auto; padding: 1.5rem clamp(1rem, 4vw, 1.5rem) 4rem; }
.post-back { display: inline-block; color: var(--w3-muted) !important; text-decoration: none; font-size: .9rem; margin-bottom: 1.5rem; }
.post-back:hover { color: var(--w3-gold) !important; }

.post-header { margin-bottom: 1.8rem; }
.post-community { display: inline-block; font-family: 'JetBrains Mono', monospace; font-size: .74rem; letter-spacing: .12em; text-transform: uppercase; color: var(--w3-gold) !important; text-decoration: none; background: rgba(245,184,0,.1); border: 1px solid rgba(245,184,0,.3); padding: .3rem .7rem; border-radius: 999px; margin-bottom: 1rem; }
.post-title { font-size: clamp(1.9rem, 4.5vw, 3rem); font-weight: 700; line-height: 1.12; letter-spacing: -0.02em; margin: 0 0 1.3rem; }
.post-byline { display: flex; align-items: center; gap: .8rem; }
.post-byline-main { display: flex; flex-direction: column; gap: .1rem; }
.post-byline-meta { color: var(--w3-muted); font-size: .85rem; }
.post-byline-meta :deep(a) { color: var(--w3-muted); }
.post-reward { margin-left: auto; }
.post-reward :deep(*) { color: var(--w3-gold) !important; font-weight: 700; }

.post-notice { background: var(--w3-panel); border: 1px solid var(--w3-border); border-radius: 12px; padding: 1rem 1.2rem; margin-bottom: 1.5rem; font-size: .9rem; }

.post-body { margin: 0 0 2rem; }

.post-tags { display: flex; flex-wrap: wrap; gap: .5rem; margin-bottom: 2rem; }
.post-tag { padding: .3rem .8rem; background: var(--w3-panel); border: 1px solid var(--w3-border); border-radius: 999px; font-size: .8rem; font-weight: 600; color: var(--w3-muted) !important; text-decoration: none; }
.post-tag:hover { border-color: rgba(245,184,0,.5); color: var(--w3-gold) !important; }

/* glowing action bar */
.post-actions {
  position: sticky; bottom: 1rem; z-index: 5;
  display: flex; align-items: center; justify-content: space-between; gap: 1rem;
  padding: .7rem 1.1rem; margin: 0 0 2.5rem;
  background: rgba(14,14,20,.85); backdrop-filter: blur(14px);
  border: 1px solid var(--w3-border); border-radius: 999px;
  box-shadow: 0 10px 40px rgba(0,0,0,.5), 0 0 30px rgba(224,31,38,.08);
}
.post-actions-left { display: flex; align-items: center; gap: .8rem; }
.post-actions-comments { color: var(--w3-muted) !important; text-decoration: none; font-weight: 600; font-size: .9rem; }
.post-actions-comments:hover { color: var(--w3-gold) !important; }

.post-h3 { font-size: 1.2rem; font-weight: 700; margin: 0; }
.post-reply { margin-bottom: 2.5rem; }
.post-reply .post-h3 { margin-bottom: .9rem; }

.post-comments-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.2rem; padding-bottom: .8rem; border-bottom: 1px solid var(--w3-border); }
.post-comments-list { display: flex; flex-direction: column; gap: .3rem; }
</style>
