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
            <div slot="error" slot-scope="{ trigger }">
              Something went wrong! click <a href="javascript:;" @click="trigger">here</a> to retry.
            </div>

            <div slot="no-more" />

            <div slot="no-results" />
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
import postIndex from '@/mixins/postIndex'

export default {
  name: 'UserPosts',

  mixins: [postIndex],

  data () {
    return {
      endpoint: 'get_discussions_by_blog',
      params: {}
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

<style>

</style>
