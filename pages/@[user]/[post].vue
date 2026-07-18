<template>
  <b-container fluid="lg">
    <b-card tag="article" class="full-post">
      <h1 class="entry-header">
        {{ post.title }}
      </h1>

      <div class="d-flex justify-content-between mb-2">
        <div class="d-flex">
          <b-avatar :src="`${config.IMAGES_CDN}u/${post.author}/avatar`" variant="dark" size="40px" class="me-2" />

          <div class="d-flex flex-column">
            <author :author="post.author" :reputation="post.author_reputation" />

            <div>
              <timeago class="small" :datetime="createdAt" :title="createdAt.toLocaleString()" :auto-update="60" />

              <template v-if="createdAt.getTime() !== updatedAt.getTime()">
                (<span v-b-tooltip.hover class="small" :title="updatedAt.toLocaleString()">Edited</span>)
              </template>
            </div>

            <template v-if="postAuthor !== post.author">
              <div class="small">
                Authored by <nuxt-link :to="{name:'user', params: { user: postAuthor }}">
                  @{{ postAuthor }}
                </nuxt-link>
              </div>
            </template>
          </div>
        </div>

        <div>
          <b-badge variant="success" class="text-uppercase p-2" tag="div">
            <nuxt-link :to="{name:'sort-tag', params:{sort:'trending', tag: community.tag}}">
              {{ community.title }}
            </nuxt-link>
          </b-badge>
        </div>
      </div>

      <div v-if="post.depth >= 1" class="border p-3">
        <p class="fw-bold">
          You are viewing a single comment's thread:
        </p>

        <ul class="m-0 list-unstyled">
          <li>
            <nuxt-link :to="post.url">
              View full context
            </nuxt-link>
          </li>

          <li>
            <nuxt-link :to="{name:'user-post', params: {user: post.parent_author, post: post.parent_permlink}}">
              View direct parent
            </nuxt-link>
          </li>
        </ul>
      </div>

      <markdown-viewer class="mt-3" :text="post.body" />

      <hr>

      <div v-if="post.json_metadata.tags" class="d-flex flex-wrap">
        <nuxt-link v-for="(tag, i) of post.json_metadata.tags" :key="i" class="badge text-bg-secondary mw-100 b-form-tag text-uppercase me-2 mt-1 px-2" :to="{name:'sort-tag', params:{sort:'trending', tag}}">
          {{ tag }}
        </nuxt-link>
      </div>
      <hr>

      <div class="d-flex align-items-center justify-content-between fw-bold mb-3">
        <div class="d-flex align-items-center">
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

        <payout :post="post" />
      </div>

      <reply-editor :parent-author="post.author" :parent-permlink="post.permlink" :autofocus="false" />

      <div id="comments">
        <div class="d-flex justify-content-between align-items-center mt-5">
          <div>{{ Object.keys(discussions).length - 1 }} comments</div>

          <b-dropdown variant="link" lazy end size="sm">
            <template #button-content>
              <fa-icon icon="sort-amount-down" /> {{ sortOptions[sortBy] }}
            </template>

            <b-dropdown-item v-for="(option, i) of Object.keys(sortOptions)" :key="i" @click.prevent="sortBy = option">
              {{ sortOptions[option] }}
            </b-dropdown-item>
          </b-dropdown>
        </div>

        <div class="mt-3">
          <div v-for="(permlink, i) of post.replies" :key="i">
            <comment :permlink="permlink" :discussions="discussions" />
          </div>
        </div>
      </div>
    </b-card>
  </b-container>
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

    const discussions = ref({})
    const permlinks = ref([])

    await useAsyncData(`post-${route.params.user}-${route.params.post}`, async () => {
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

        discussions.value = d
        permlinks.value = Object.keys(d)
      } catch (e) {
        // Not found / RPC error — validated at setup level below.
      }

      return true
    })

    // Validate AFTER useAsyncData resolves, at setup level. A `throw createError`
    // inside the useAsyncData callback is only captured into its error ref (render
    // continues with an undefined post -> 500 on {{ post.title }}); thrown here it
    // properly aborts to a 404. Covers both fetch failures and get_discussion
    // succeeding without the requested post (some comment permlinks / hivemind quirks).
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
