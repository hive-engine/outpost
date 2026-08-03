<template>
  <div class="sort-page">
    <div class="page-header">
      <b-container v-if="$route.params.sort !== 'curated'" class="mb-2" fluid>
        <category-chips />
      </b-container>

      <b-container>
        <div class="d-flex align-items-center justify-content-center">
          <h2 class="me-3">
            #{{ params.tag }}
          </h2>

          <b-dropdown variant="link" lazy no-caret toggle-class="p-0" menu-class="w-100">
            <template #button-content>
              <h2 class="d-inline">
                {{ dropdownTitle }}
              </h2> <fa-icon class="ms-1" icon="angle-down" />
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
        No {{ $route.params.sort }} {{ $route.params.tag }} posts found!
      </b-card>
    </b-container>
  </div>
</template>

<script>
// Ported from legacy/pages/_sort/_tag/index.vue (route name 'sort-tag', path /:sort/:tag).
// asyncData/fetch() -> async setup() + useAsyncData; head() -> useHead();
// posts/infiniteId/event-bus handlers from the postIndex mixin.
import postIndex from '@/mixins/postIndex'
import TrendingTags from '@/components/cards/TrendingTags.vue'
import { useScotStore } from '~/stores/scot'

const endpoints = {
  created: 'get_discussions_by_created',
  promoted: 'get_discussions_by_promoted',
  trending: 'get_discussions_by_trending',
  hot: 'get_discussions_by_hot'
}

const titles = {
  created: 'Recent Posts',
  promoted: 'Promoted Posts',
  trending: 'Trending Posts',
  hot: 'Hot Posts'
}

export default {
  name: 'SortTagPage',

  components: {
    TrendingTags
  },

  mixins: [postIndex],

  async setup () {
    definePageMeta({ name: 'sort-tag' })

    const config = useRuntimeConfig().public
    const route = useRoute()
    const scot = useScotStore()

    const pageTitle = computed(() => {
      const { sort, tag } = route.params
      const t = {
        created: `#${tag} Recent Posts`,
        promoted: `#${tag} Promoted Posts`,
        trending: `#${tag} Trending Posts`,
        hot: `#${tag} Hot Posts`
      }
      return t[sort]
    })

    useHead(() => ({ title: pageTitle.value }))

    const { data: initialPosts } = await useAsyncData(
      `sort-tag-${route.params.sort}-${route.params.tag}`,
      () => scot.fetchPosts({ endpoint: endpoints[route.params.sort], params: { tag: route.params.tag } })
    )

    return { config, pageTitle, initialPosts }
  },

  data () {
    return {
      loading: false,
      endpoint: 'get_discussions_by_trending',
      params: {}
    }
  },

  created () {
    const { sort, tag } = this.$route.params

    this.params = { tag }
    this.endpoint = endpoints[sort]

    if (this.initialPosts) {
      this.posts.push(...this.initialPosts)
    }
  },

  computed: {
    dropdownTitle () {
      return titles[this.$route.params.sort]
    }
  },

  watch: {
    '$route.params' () {
      this.loadPosts()
    }
  },

  methods: {
    async loadPosts () {
      this.loading = true
      this.posts = []
      this.infiniteId += 1

      const { sort, tag } = this.$route.params

      this.params = { tag }
      this.endpoint = endpoints[sort]

      const scot = useScotStore()

      const posts = await scot.fetchPosts({ endpoint: this.endpoint, params: this.params })

      this.posts.push(...posts)

      this.loading = false
    },

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
