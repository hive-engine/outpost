<template>
  <div class="sort-page">
    <div class="page-header">
      <b-container v-if="$route.params.sort !== 'curated'" class="mb-2" fluid>
        <trending-tags :sort="$route.params.sort" />
      </b-container>

      <b-container>
        <b-dropdown variant="link" lazy no-caret toggle-class="p-0" menu-class="w-100">
          <template #button-content>
            <h2 class="d-inline">
              {{ pageTitle }}
            </h2> <fa-icon class="ml-1" icon="angle-down" />
          </template>

          <b-dropdown-item v-if="$route.path !== 'trending'" :to="{name:'sort', params:{sort:'trending'}}">
            Trending
          </b-dropdown-item>

          <b-dropdown-item v-if="$route.path !== 'hot'" :to="{name:'sort', params:{sort:'hot'}}">
            Hot
          </b-dropdown-item>

          <b-dropdown-item v-if="$route.path !== 'created'" :to="{name:'sort', params:{sort:'created'}}">
            Recent
          </b-dropdown-item>

          <b-dropdown-item v-if="$route.path !== 'promoted'" :to="{name:'sort', params:{sort:'promoted'}}">
            Promoted
          </b-dropdown-item>
        </b-dropdown>
      </b-container>
    </div>

    <b-container fluid="lg">
      <template v-if="loading">
        <loading />
      </template>

      <template v-else-if="posts.length > 0">
        <div v-for="(post,i) of posts" :key="i">
          <post-summary :post="post" />
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
        No {{ $route.params.sort }} posts found!
      </b-card>
    </b-container>
  </div>
</template>

<script>
import postIndex from '@/mixins/postIndex'
import TrendingTags from '@/components/cards/TrendingTags.vue'

export default {
  name: 'SortPage',

  components: {
    TrendingTags
  },

  mixins: [postIndex],

  data () {
    return {
      endpoint: 'get_discussions_by_trending'
    }
  },

  async fetch () {
    this.loading = true

    const endpoints = {
      created: 'get_discussions_by_created',
      promoted: 'get_discussions_by_promoted',
      trending: 'get_discussions_by_trending',
      hot: 'get_discussions_by_hot',
      curated: 'curated'
    }

    this.endpoint = endpoints[this.$route.params.sort]

    const posts = await this.fetchPosts({ endpoint: this.endpoint })

    this.posts.push(...posts)

    this.loading = false
  },

  head () {
    return {
      title: this.pageTitle
    }
  },

  computed: {
    pageTitle () {
      const titles = {
        created: 'Recent Posts',
        promoted: 'Promoted Posts',
        trending: 'Trending Posts',
        hot: 'Hot Posts',
        curated: 'Curator\'s Picks'
      }

      return titles[this.$route.params.sort]
    }
  },

  methods: {
    async infiniteHandler ($state) {
      let params = {}

      if (this.posts.length > 1) {
        params = {
          ...params,
          start_author: this.posts[this.posts.length - 1].author,
          start_permlink: this.posts[this.posts.length - 1].permlink
        }

        if (this.endpoint === 'curated') {
          params.from = this.posts[this.posts.length - 1].next_history_index
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
