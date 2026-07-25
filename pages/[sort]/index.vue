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
            </h2> <fa-icon class="ms-1" icon="angle-down" />
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
        No {{ $route.params.sort }} posts found!
      </b-card>
    </b-container>
  </div>
</template>

<script>
// Ported from legacy/pages/_sort/index.vue (route name 'sort', path /:sort).
// asyncData/fetch() -> async setup() + useAsyncData; head() -> useHead();
// $config -> useRuntimeConfig().public; store.fetchPosts via useScotStore().
// posts/infiniteId/event-bus handlers come from the postIndex mixin (Options API).
// vue-infinite-loading slot="x" scoped slots -> #x named slots.
import postIndex from '@/mixins/postIndex'
import TrendingTags from '@/components/cards/TrendingTags.vue'
import { useScotStore } from '~/stores/scot'

const endpoints = {
  created: 'get_discussions_by_created',
  promoted: 'get_discussions_by_promoted',
  trending: 'get_discussions_by_trending',
  hot: 'get_discussions_by_hot',
  curated: 'curated'
}

const titles = {
  created: 'Recent Posts',
  promoted: 'Promoted Posts',
  trending: 'Trending Posts',
  hot: 'Hot Posts',
  curated: 'Curator\'s Picks'
}

export default {
  name: 'SortPage',

  components: {
    TrendingTags
  },

  mixins: [postIndex],

  async setup () {
    // Route name 'sort' + legacy path regex `:sort(hot|trending|...|curated)` -> definePageMeta.
    definePageMeta({
      name: 'sort',
      validate: route => ['hot', 'trending', 'promoted', 'payout', 'payout_comments', 'muted', 'created', 'curated'].includes(route.params.sort)
    })

    const config = useRuntimeConfig().public
    const route = useRoute()
    const scot = useScotStore()

    const pageTitle = computed(() => titles[route.params.sort])

    useHead(() => ({ title: pageTitle.value }))

    const { data: initialPosts } = await useAsyncData(
      `sort-${route.params.sort}`,
      () => scot.fetchPosts({ endpoint: endpoints[route.params.sort] })
    )

    return { config, pageTitle, initialPosts }
  },

  data () {
    return {
      loading: false,
      endpoint: 'get_discussions_by_trending'
    }
  },

  created () {
    this.endpoint = endpoints[this.$route.params.sort]

    if (this.initialPosts) {
      this.posts.push(...this.initialPosts)
    }
  },

  watch: {
    '$route.params.sort' () {
      this.loadPosts()
    }
  },

  methods: {
    async loadPosts () {
      this.loading = true
      this.posts = []
      this.infiniteId += 1

      this.endpoint = endpoints[this.$route.params.sort]

      const scot = useScotStore()

      const posts = await scot.fetchPosts({ endpoint: this.endpoint })

      this.posts.push(...posts)

      this.loading = false
    },

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
