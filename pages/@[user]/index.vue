<template>
  <div class="user-posts">
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
        Looks like @{{ $route.params.user }} hasn't started blogging yet!
      </b-card>
    </b-container>
  </div>
</template>

<script>
// Ported from legacy/pages/_user/index.vue (route name 'user', path /@:user).
// fetch() -> async setup() + useAsyncData; posts/infiniteId from postIndex mixin.
import postIndex from '@/mixins/postIndex'
import { useScotStore } from '~/stores/scot'

const endpoint = 'get_discussions_by_blog'

export default {
  name: 'UserPosts',

  mixins: [postIndex],

  async setup () {
    definePageMeta({ name: 'user' })

    const route = useRoute()
    const scot = useScotStore()

    const { data: initialPosts } = await useAsyncData(
      `user-blog-${route.params.user}`,
      () => scot.fetchPosts({ endpoint, params: { tag: route.params.user } })
    )

    return { initialPosts }
  },

  data () {
    return {
      loading: false,
      endpoint,
      params: {}
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
      let params = this.params

      if (this.posts.length > 1) {
        params = {
          ...params,
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
