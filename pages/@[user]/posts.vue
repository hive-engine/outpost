<template>
  <div class="user-own-posts">
    <b-container fluid="lg">
      <template v-if="loading">
        <loading />
      </template>

      <template v-else-if="posts.length > 0">
        <div v-for="(post,i) of posts" :key="i">
          <post-summary :post="post" :user="$route.params.user" type="user-feed" />
        </div>

        <client-only>
          <infinite-loading :identifier="infiniteId" spinner="waveDots" @infinite="infiniteHandler">
            <template #error="{ trigger }">
              Something went wrong! click <a href="javascript:;" @click="trigger">here</a> to retry.
            </template>

            <template #no-more>
              <div />
            </template>

            <template #no-results>
              <div />
            </template>
          </infinite-loading>
        </client-only>
      </template>

      <b-card v-else class="mt-5">
        Looks like @{{ $route.params.user }} hasn't posted anything yet!
      </b-card>
    </b-container>
  </div>
</template>

<script>
// Profile "Posts" tab — this user's OWN authored posts, newest first (no reblogs),
// like PeakD's /@user/posts (owner request: "a place to see all my posts in order").
// Reuses the blog feed (SCOT get_discussions_by_blog, which yields PostSummary-ready
// posts) and filters to author === user. Pagination tracks the RAW cursor so
// filtered-out reblogs never create gaps.
import postIndex from '@/mixins/postIndex'
import { useScotStore } from '~/stores/scot'

const endpoint = 'get_discussions_by_blog'

export default {
  name: 'UserOwnPosts',

  mixins: [postIndex],

  async setup () {
    definePageMeta({ name: 'user-posts' })

    const route = useRoute()
    const scot = useScotStore()

    const { data: initialPosts } = await useAsyncData(
      `user-own-posts-${route.params.user}`,
      () => scot.fetchPosts({ endpoint, params: { tag: route.params.user } })
    )

    return { initialPosts }
  },

  data () {
    return {
      loading: false,
      endpoint,
      cursor: null
    }
  },

  created () {
    const raw = this.initialPosts || []
    if (raw.length) { this.cursor = raw[raw.length - 1] }
    this.posts.push(...this.ownPosts(raw))
  },

  methods: {
    // Own top-level posts only — drop reblogs (original author != this profile).
    ownPosts (arr) {
      return arr.filter(p => p.author === this.$route.params.user)
    },

    async infiniteHandler ($state) {
      const params = { tag: this.$route.params.user }

      if (this.cursor) {
        params.start_author = this.cursor.author
        params.start_permlink = this.cursor.permlink
      }

      const raw = await this.fetchPosts({ endpoint: this.endpoint, params })

      // Paginated SCOT results repeat the cursor as the first item — drop it.
      const fresh = this.cursor ? raw.slice(1) : raw

      if (fresh.length > 0) {
        this.cursor = fresh[fresh.length - 1]
        this.posts.push(...this.ownPosts(fresh))
        $state.loaded()
      } else {
        $state.complete()
      }
    }
  }
}
</script>
