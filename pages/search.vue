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
    <div class="search-results mt-3 mb-5">
      <template v-if="loading">
        <loading />
      </template>

      <template v-if="searched">
        <p v-if="!searchResults.length > 0" class="text-center text-muted font-weight-bold">
          No matching results found!
        </p>

        <p v-if="!searchResults.length > 0 && searchError === true" class="text-center text-muted font-weight-bold">
          We had some problems finding your results. It might be that we have some technical issues or it might be that you used an extremely common phrase. Try again with a different search term!
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
import axios from 'axios'
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
      searchError: false,
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
        this.searched = false
        this.searchResults = []
        this.searchError = false
        const request = await axios.get('https://cinesearch.hivedata.live/searchByTitle', { params: this.params })
        if (request.status === 200) {
          if (request.data.length > 0) {
            this.searchResults = request.data
            const query = await Promise.all(this.searchResults.map(async (r) => {
              let postData = {}
              postData = await this.fetchPost({ author: r.author, permlink: r.permlink })
              if (postData) {
                postData.permlink = r.permlink
              }
              return postData
            }))
            this.posts = query.filter(item => item)
          }
        } else {
          this.searchError = true
        }
        this.loading = false
        this.searched = true
      }
    }
  }
}
</script>

<style>

</style>
