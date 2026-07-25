<template>
  <div class="user-comments">
    <b-container fluid="lg">
      <template v-if="loading">
        <loading />
      </template>

      <template v-else-if="posts.length > 0">
        <div v-for="(post,i) of posts" :key="i">
          <post-summary :post="post" type="comments" />
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
        Looks like @{{ $route.params.user }} hasn't received any replies yet!
      </b-card>
    </b-container>
  </div>
</template>

<script>
// Ported from legacy/pages/_user/replies.vue (route name 'user-replies').
// fetch() -> async setup() + useAsyncData; head() -> useHead; postIndex mixin.
import postIndex from '@/mixins/postIndex'
import { useScotStore } from '~/stores/scot'

const endpoint = 'get_discussions_by_replies'

export default {
  name: 'UserReplies',

  mixins: [postIndex],

  async setup () {
    definePageMeta({ name: 'user-replies' })

    useHead({ title: 'Replies to' })

    const route = useRoute()
    const scot = useScotStore()

    const { data: initialPosts } = await useAsyncData(
      `user-replies-${route.params.user}`,
      () => scot.fetchPosts({ endpoint, params: { tag: route.params.user } })
    )

    return { initialPosts }
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
