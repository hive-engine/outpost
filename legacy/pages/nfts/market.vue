<template>
  <div class="nftmarketplace-gallery">
    <b-container fluid="lg">
      <b-row align-h="center">
        <b-col md="8" lg="6">
          <search class="mt-0 mb-0" />
        </b-col>
      </b-row>

      <b-form-row class="mt-5 justify-content-between">
        <b-col sm="12" md="5" lg="4">
          <b-form-group label="Price">
            <b-row no-gutters>
              <b-col cols="4">
                <b-form-input
                  v-model="minPrice"
                  type="number"
                  placeholder="Min"
                  trim
                />
              </b-col>
              <b-col cols="4" class="pl-1">
                <b-form-input
                  v-model="maxPrice"
                  type="number"
                  placeholder="Max"
                  trim
                />
              </b-col>
              <b-col cols="4" class="pl-1">
                <b-button block variant="primary" @click="filterByPrice">
                  Filter
                </b-button>
              </b-col>
            </b-row>
          </b-form-group>
        </b-col>

        <b-col sm="4" md="3">
          <b-form-group label="Rights">
            <b-form-select v-model="rights" :options="rightsOptions" />
          </b-form-group>
        </b-col>

        <b-col sm="4" md="2">
          <b-form-group label="Sort By">
            <b-form-select v-model="sortBy" :options="sortOptions" />
          </b-form-group>
        </b-col>
      </b-form-row>

      <template v-if="loading">
        <loading />
      </template>

      <template v-else-if="items.length > 0">
        <b-row class="mt-5">
          <b-col
            v-for="(nft,i) of items"
            :key="i"
            class="mb-5"
            sm="6"
            md="4"
            lg="3"
          >
            <nft :nft="nft" />
          </b-col>
        </b-row>

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
        Looks like no one started selling their precious NFTs! :)
      </b-card>
    </b-container>
  </div>
</template>

<script>
import { mapGetters } from 'vuex'
import InfiniteLoading from 'vue-infinite-loading'
import Nft from '@/components/nftmarketplace/Nft.vue'
import Search from '@/components/nftmarketplace/Search.vue'

export default {
  name: 'NFTS',

  components: {
    InfiniteLoading,
    Nft,
    Search
  },

  data () {
    return {
      infiniteId: 1,
      items: [],

      limit: 20,
      page: 1,

      sortBy: 'newest',
      sortOptions: [
        { text: 'Newest', value: 'newest' },
        { text: 'Oldest', value: 'oldest' },
        { text: 'Lowest Price', value: 'price_asc' },
        { text: 'Highest Price', value: 'price_desc' },
        { text: 'Recently Updated', value: 'updated' }
      ],

      rights: null,
      rightsOptions: [
        { value: null, text: 'Any Rights' },
        { value: 1, text: 'Private' },
        { value: 2, text: 'Limited Production Rights' }
      ],

      minPrice: '',
      maxPrice: ''
    }
  },

  async fetch () {
    this.loading = true

    const items = await this.fetchMarket()

    this.items.push(...items)

    this.page += 1

    this.loading = false
  },

  head () {
    return {
      title: 'NFT Gallery'
    }
  },

  computed: {
    ...mapGetters('nftmarketplace', ['settings'])
  },

  watch: {
    async sortBy () {
      this.page = 1
      this.items = []

      await this.$fetch()
    },

    async rights () {
      this.page = 1
      this.items = []

      await this.$fetch()
    }
  },

  methods: {
    async fetchMarket () {
      const params = {
        page: this.page,
        limit: this.limit,
        sort_by: this.sortBy
      }

      if (this.rights) {
        params.rights = this.rights
      }

      if (this.minPrice !== '') {
        params.price_min = this.minPrice
      }

      if (this.maxPrice !== '') {
        params.price_max = this.maxPrice
      }

      return await this.$nftm.$get('market', { params })
    },

    async filterByPrice () {
      this.page = 1
      this.items = []

      await this.$fetch()
    },

    async infiniteHandler ($state) {
      try {
        const items = await this.fetchMarket()

        if (items.length) {
          this.page += 1

          this.items.push(...items)

          if ($state) { $state.loaded() }
        } else if ($state) { $state.complete() }
      } catch (e) {
        console.log(e)
      }
    }
  }
}
</script>

<style>

</style>
