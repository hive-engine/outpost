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
            <div slot="error" slot-scope="{ trigger }">
              Something went wrong! click <a href="javascript:;" @click="trigger">here</a> to retry.
            </div>

            <div slot="no-more" />

            <div slot="no-results" />
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
import postIndex from '@/mixins/postIndex'

export default {
  name: 'Feed',

  mixins: [postIndex],

  data () {
    return {
      params: {},
      endpoint: 'get_discussions_by_replies'
    }
  },

  async fetch () {
    this.loading = true

    const { user } = this.$route.params

    this.params = {
      tag: user
    }

    const posts = await this.fetchPosts({ endpoint: this.endpoint, params: this.params })

    this.posts.push(...posts)

    this.loading = false
  },

  head () {
    return {
      title: 'Replies to'
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

<style>

</style>
