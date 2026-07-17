<template>
  <b-container fluid="lg">
    <div class="search-form">
      <label ref="label" for="search-input" class="search-label">Search...</label>
      <input
        id="search-input"
        ref="input"
        v-model="searchQuery"
        type="text"
        name="q"
        class="search-input"
        autocomplete="false"
        @focus="searchActive"
        @blur="searchBlured"
        @keyup.enter="search"
      >
      <hr ref="divider" class="divider m-0 p-0">
    </div>

    <div class="search-results">
      <template v-if="loading">
        <loading />
      </template>

      <template v-if="searched">
        <p v-if="searchResults.length <= 0" class="text-center text-muted font-weight-bold">
          No matching results found!
        </p>

        <b-row v-else>
          <b-col cols="12" class="mt-3 mb-3">
            <p class="text-muted font-weight-bold">
              {{ searchResults.length }} results for "{{ resultsFor }}"
            </p>
          </b-col>

          <b-col v-for="(series,i) in searchResults" :key="i" md="4">
            <nft :nft="series" />
          </b-col>
        </b-row>
      </template>
    </div>
  </b-container>
</template>

<script>
import Nft from '@/components/nftmarketplace/Nft.vue'

export default {
  name: 'Search',

  components: {
    Nft
  },

  data () {
    return {
      searchQuery: '',
      resultsFor: '',
      inputActive: false,
      searched: false,
      searchResults: []
    }
  },

  async fetch () {
    if (this.$route.query.q) {
      this.searchQuery = this.$route.query.q
    }

    if (this.searchQuery.length > 0) {
      this.resultsFor = this.searchQuery

      this.loading = true

      this.searchResults = await this.$nftm.$post('search', { q: this.searchQuery })

      this.loading = false
      this.searched = true
    }
  },

  head () {
    let title = 'Search'

    if (this.searchQuery.length > 0) {
      title = `NFT Search Results for "${this.searchQuery}"`
    }

    return {
      title
    }
  },

  watch: {
    '$route.query': '$fetch'
  },

  mounted () {
    if (this.searchQuery.length > 0) {
      this.searchActive()
    }
  },

  methods: {
    searchActive () {
      this.$refs.label.classList.add('active')
      this.$refs.divider.classList.add('active')
    },

    searchBlured () {
      if (!this.inputActive) {
        this.$refs.label.classList.remove('active')
        this.$refs.divider.classList.remove('active')
      }
    },

    search () {
      if (this.searchQuery.length <= 0) { return }

      this.$router.push({ name: 'nfts-search', query: { q: this.searchQuery } })
    }
  }
}
</script>

<style>

</style>
