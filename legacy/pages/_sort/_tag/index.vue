<template>
  <div class="sort-page">
    <div class="page-header">
      <b-container v-if="$route.params.sort !== 'curated'" class="mb-2" fluid>
        <trending-tags :sort="$route.params.sort" />
      </b-container>

      <b-container>
        <div class="d-flex align-items-center justify-content-center">
          <h2 class="mr-3">
            #{{ params.tag }}
          </h2>

          <b-dropdown variant="link" lazy no-caret toggle-class="p-0" menu-class="w-100">
            <template #button-content>
              <h2 class="d-inline">
                {{ dropdownTitle }}
              </h2> <fa-icon class="ml-1" icon="angle-down" />
            </template>

            <b-dropdown-item v-if="$route.path !== 'trending'" :to="{name:'sort-tag', params:{sort:'trending', tag: params.tag}}">
              Trending
            </b-dropdown-item>

            <b-dropdown-item v-if="$route.path !== 'hot'" :to="{name:'sort-tag', params:{sort:'hot', tag: params.tag}}">
              Hot
            </b-dropdown-item>

            <b-dropdown-item v-if="$route.path !== 'created'" :to="{name:'sort-tag', params:{sort:'created', tag: params.tag}}">
              Recent
            </b-dropdown-item>

            <b-dropdown-item v-if="$route.path !== 'promoted'" :to="{name:'sort', params:{sort:'promoted', tag: params.tag}}">
              Promoted
            </b-dropdown-item>
          </b-dropdown>
        </div>
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
            <div slot="error" slot-scope="{ trigger }">
              Something went wrong! click <a href="javascript:;" @click="trigger">here</a> to retry.
            </div>

            <div slot="no-more" />

            <div slot="no-results" />
          </infinite-loading>
        </client-only>
      </template>

      <b-card v-else class="mt-5">
        No {{ $route.params.sort }} {{ $route.params.tag }} posts found!
      </b-card>
    </b-container>
  </div>
</template>

<script>
import postIndex from '@/mixins/postIndex'
import TrendingTags from '@/components/cards/TrendingTags.vue'

export default {
  name: 'SortTagPage',

  components: {
    TrendingTags
  },

  mixins: [postIndex],

  data () {
    return {
      endpoint: 'get_discussions_by_trending',
      params: {}
    }
  },

  async fetch () {
    this.loading = true

    const endpoints = {
      created: 'get_discussions_by_created',
      promoted: 'get_discussions_by_promoted',
      trending: 'get_discussions_by_trending',
      hot: 'get_discussions_by_hot'
    }

    const { sort, tag } = this.$route.params

    this.params = {
      tag
    }

    this.endpoint = endpoints[sort]

    const posts = await this.fetchPosts({ endpoint: this.endpoint, params: this.params })

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
      const { sort, tag } = this.$route.params

      const titles = {
        created: `#${tag} Recent Posts`,
        promoted: `#${tag} Promoted Posts`,
        trending: `#${tag} Trending Posts`,
        hot: `#${tag} Hot Posts`
      }

      return titles[sort]
    },

    dropdownTitle () {
      const { sort } = this.$route.params

      const titles = {
        created: 'Recent Posts',
        promoted: 'Promoted Posts',
        trending: 'Trending Posts',
        hot: 'Hot Posts'
      }

      return titles[sort]
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
