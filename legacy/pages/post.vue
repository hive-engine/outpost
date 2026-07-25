<template>
  <b-container fluid="lg">
    <b-card tag="article" class="full-post">
      <h1 class="entry-header">
        {{ post.title }}
      </h1>

      <div class="d-flex justify-content-between mb-2">
        <div class="d-flex">
          <b-avatar :src="`${$config.IMAGES_CDN}u/${post.author}/avatar`" variant="dark" size="40px" class="mr-2" />

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
        <p class="font-weight-bold">
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
        <nuxt-link v-for="(tag, i) of post.json_metadata.tags" :key="i" class="badge badge-secondary mw-100 b-form-tag text-uppercase mr-2 mt-1 px-2" :to="{name:'sort-tag', params:{sort:'trending', tag}}">
          {{ tag }}
        </nuxt-link>
      </div>
      <hr>

      <div class="d-flex align-items-center justify-content-between font-weight-bold mb-3">
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

          <b-dropdown variant="link" lazy right size="sm">
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
import { mapGetters, mapActions } from 'vuex'
import { proxifyImageUrl } from '@/utils/proxify-url'
import { extractImageLink, extractBodySummary, extractCanonicalLink } from '@/utils/extract-content'
import Author from '@/components/cards/Author.vue'
import Comment from '@/components/cards/Comment.vue'
import MarkdownViewer from '@/components/MarkdownViewer.vue'
import ReplyEditor from '@/components/ReplyEditor.vue'
import ExtraActions from '@/components/ExtraActions.vue'
import Votes from '@/components/Votes.vue'
import Payout from '@/components/Payout.vue'

export default {
  name: 'SinglePostPage',

  components: {
    Author,
    Comment,
    MarkdownViewer,
    ReplyEditor,
    ExtraActions,
    Votes,
    Payout
  },

  async asyncData ({ $chain, $auth, route, error }) {
    let discussions = null
    let permlinks = []

    try {
      const client = $chain.getClient()

      const { user: author, post: permlink } = route.params

      const params = { author, permlink }

      if ($auth.loggedIn) {
        params.observer = $auth.user.username
      }

      discussions = await client.hivemind.call('get_discussion', params)

      Object.keys(discussions).forEach((permlink) => {
        discussions[permlink] = {
          ...discussions[permlink],
          pending_token: 0,
          vote_rshares: 0,
          total_payout_value: 0,
          estimated_payout_value: 0
        }
      })

      permlinks = Object.keys(discussions)
    } catch (e) {
      return error({ statusCode: 404, message: 'Content was not found!' })
    }

    return {
      discussions,
      permlinks
    }
  },

  data () {
    return {
      sortBy: '',
      sortOptions: {
        reward: 'Reward',
        newest: 'Newest',
        oldest: 'Oldest',
        reputation: 'Reputation'
      }
    }
  },

  fetchOnServer: false,

  async fetch () {
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
  },

  head () {
    const link = []

    const description = extractBodySummary(this.post.body)
    let thumbnail = extractImageLink(this.post.json_metadata, this.post.body)
    const canonicalLink = extractCanonicalLink(this.post.json_metadata, this.post.category, this.post.author, this.post.permlink)

    const meta = [
      { hid: 'description', name: 'description', content: description },
      { hid: 'og-type', property: 'og:type', content: 'article' },
      { hid: 'og-title', property: 'og:title', content: this.post.title },
      { hid: 'og-description', property: 'og:description', content: description },

      { hid: 'twitter-card', name: 'twitter:card', content: 'summary_large_image' },
      { hid: 'twitter-title', name: 'twitter:title', content: this.post.title },
      { hid: 'twitter-description', name: 'twitter:description', content: description }
    ]

    if (thumbnail) {
      thumbnail = proxifyImageUrl(thumbnail, '1200x630')

      meta.push({ hid: 'og-image', property: 'og:image', content: thumbnail })
      meta.push({ hid: 'twitter-image', name: 'twitter:image', content: thumbnail })
    }

    if (canonicalLink) {
      link.push({ hid: 'canonical', rel: 'canonical', href: canonicalLink })
    }

    return {
      title: this.post.title,
      meta,
      link
    }
  },

  computed: {
    ...mapGetters('scot', ['communities', 'accounts']),

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

  mounted () {
    this.$eventBus.$on(['upvote-successful', 'downvote-successful', 'unvote-successful'], this.onVote)

    this.$eventBus.$on(['comment-publish-successful', 'comment-edit-successful'], this.onComment)

    this.$eventBus.$on(['post-delete-successful', 'comment-delete-successful'], this.onDelete)
  },

  beforeDestroy () {
    this.$eventBus.$off(['upvote-successful', 'downvote-successful', 'unvote-successful'], this.onVote)

    this.$eventBus.$off(['comment-publish-successful', 'comment-edit-successful'], this.onComment)

    this.$eventBus.$off(['post-delete-successful', 'comment-delete-successful'], this.onDelete)
  },

  methods: {
    ...mapActions('scot', ['fetchPost', 'fetchThread']),
    ...mapActions('user', ['fetchAccountScotData']),

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
        token: this.$config.TOKEN,
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

        console.log({ authorperm, parent, dis: this.discussions[authorperm] })

        delete this.discussions[authorperm]
      }
    }
  }
}
</script>

<style>

</style>
