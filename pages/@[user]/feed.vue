<template>
  <div class="user-feed">
    <div class="page-header">
      <b-container>
        <h2>Your Feed</h2>
      </b-container>
    </div>

    <b-container fluid="lg">
      <template v-if="loading">
        <loading />
      </template>

      <template v-else-if="posts.length > 0">
        <div v-for="(post,i) of posts" :key="i">
          <post-summary :post="post" type="feed" />
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
        You haven't followed anyone yet!<br>

        <nuxt-link class="d-inline-block mt-5" :to="{name:'sort', params:{sort:'trending'}}">
          Explore Trending
        </nuxt-link>
      </b-card>
    </b-container>
  </div>
</template>

<script>
// Ported from legacy/pages/feed.vue.
// Legacy nuxt.config extendRoutes mapped this file to route name 'user-feed', path
// '/@:user/feed' (it was NOT a child of the _user profile wrapper). Here it lives at
// pages/@[user]/feed.vue -> path /@:user/feed, name 'user-feed'. See report flag re nesting.
// fetch() -> async setup() + useAsyncData; head() -> useHead; postIndex mixin.
import postIndex from '@/mixins/postIndex'
import { useAuthStore } from '~/stores/auth'
import { useScotStore } from '~/stores/scot'

const endpoint = 'get_feed'

export default {
  name: 'UserFeed',

  mixins: [postIndex],

  async setup () {
    definePageMeta({ name: 'user-feed' })

    const auth = useAuthStore()
    const route = useRoute()
    const scot = useScotStore()

    const title = (auth.loggedIn && auth.user.username === route.params.user) ? 'Your Feed' : `@${route.params.user}'s Feed`
    useHead({ title })

    const { data: initialPosts } = await useAsyncData(
      `user-feed-${route.params.user}`,
      () => scot.fetchPosts({ endpoint, params: { tag: route.params.user } })
    )

    return { auth, initialPosts }
  },

  data () {
    return {
      loading: false,
      params: {},
      endpoint
    }
  },

  created () {
    this.params = { tag: this.$route.params.user }

    if (this.initialPosts) {
      this.posts.push(...this.initialPosts)
    }
  },

  methods: {
    async infiniteHandler ($state) {
      let params = {}

      if (this.posts.length > 1) {
        params = {
          ...this.params,
          start_author: this.posts[this.posts.length - 1].author,
          start_permlink: this.posts[this.posts.length - 1].permlink
        }
      }

      const posts = await this.fetchPosts({ endpoint: this.endpoint, params })

      if (posts.length > 1) {
        this.posts.push(...posts.slice(1, posts.length))
        $state.loaded()
      } else {
        $state.complete()
      }
    }
  }
}
</script>
