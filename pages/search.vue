<template>
  <div>
    <div class="page-header pb-0">
      <b-container>
        <h2>Search</h2>
        <br>
      </b-container>

      <b-container>
        <div>
          <b-input-group>
            <b-form-input v-model="searchQuery" type="text" placeholder="Search a post..." @keyup.enter="search" />

            <b-input-group-append>
              <b-button variant="outline-secondary" @click.prevent="search">
                <fa-icon icon="search" />
              </b-button>
            </b-input-group-append>
          </b-input-group>
        </div>
      </b-container>
      <br>

      <!-- <b-nav align="center" pills class="bg-light mt-3">
        <b-nav-item :active="$route.name === 'nfts-market'" :to="{name:'nfts-market'}">
          Posts
        </b-nav-item>
      </b-nav> -->
    </div>

    <div class="search-results">
      <template v-if="loading">
        <loading />
      </template>

      <template v-if="searched">
        <p v-if="searchResults.length <= 0" class="text-center text-muted font-weight-bold">
          No matching results found!
        </p>

        <template v-else-if="posts.length > 0">
          <div v-for="(post,i) of posts" :key="i">
            <post-summary :post="post" />
          </div>
        </template>
      </template>
    </div>
  </div>
</template>

<script>
import postIndex from '@/mixins/postIndex'

export default {
  name: 'Search',

  mixins: [postIndex],

  data () {
    return {
      searchQuery: '',
      inputActive: false,
      searched: false,
      searchResults: [],
      posts: [],
      params: {},
      endpoint: 'search'
    }
  },

  async fetch () {
    if (this.searchQuery.length > 0) {
      this.resultsFor = this.searchQuery

      this.params = {
        keyword: this.searchQuery
      }

      this.loading = true

      this.searchResults = await this.searchPosts({ endpoint: this.endpoint, params: this.params })

      this.loading = false
      this.searched = true
    }
  },
  mounted () {
    if (this.searchQuery.length > 0) {
      this.searchActive()
    }
  },

  methods: {
    async search () {
      this.posts = []
      if (this.searchQuery.length <= 0) { return }

      if (this.searchQuery.length > 0) {
        this.params = {
          keyword: this.searchQuery
        }

        this.loading = true
        this.searchResults = await this.$axios.$get('https://cinesearch.deta.dev/searchByTitle', { params: this.params, cache: { ...this.$config.AXIOS_CACHE_CONFIG, maxAge: 15 * 60 * 1000 } })
        this.posts = await Promise.all(this.searchResults.map(async (r) => {
          let postData = {}
          postData = await this.fetchPost({ author: r.author, permlink: r.permlink })
          postData.permlink = r.permlink
          return postData
        }))
        // this.searchResults.forEach(async (r) => {
        //   let postData = {}
        //   postData = await this.fetchPost({ author: r.author, permlink: r.permlink })
        //   postData.permlink = r.permlink
        //   postData.createdUnix = Math.round((new Date(r.created)).getTime() / 1000)
        //   console.log(postData.permlink)
        //   beforeSort.push(postData)
        // })

        this.loading = false
        this.searched = true
      }
    }
  }
}
</script>

<style>

</style>
