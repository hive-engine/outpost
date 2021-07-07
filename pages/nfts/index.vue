<template>
  <b-container>
    <template v-if="loading">
      <loading />
    </template>

    <template v-else>
      <section>
        <h3 class="mt-5">
          Featured NFTs
        </h3>

        <template v-if="featured.length > 0">
          <b-row class="mt-3">
            <b-col
              v-for="(nft,i) of featured"
              :key="i"
              class="mb-5"
              sm="6"
              md="4"
              lg="3"
            >
              <nft :nft="nft" />
            </b-col>
          </b-row>
        </template>

        <b-card v-else>
          No featured NFTs has been found!
        </b-card>
      </section>

      <section>
        <h3 class="mt-5">
          Newly Minted
        </h3>

        <template v-if="latest.length > 0">
          <b-row class="mt-3">
            <b-col
              v-for="(nft,i) of latest"
              :key="i"
              class="mb-5"
              sm="6"
              md="4"
              lg="3"
            >
              <nft :nft="nft" />
            </b-col>
          </b-row>
        </template>

        <b-card v-else>
          No newly minted NFTs has been found!
        </b-card>
      </section>

      <section>
        <h3 class="mt-5">
          Recently Sold
        </h3>

        <template v-if="history.length">
          <b-row class="mt-3">
            <b-col
              v-for="(nft,i) of history"
              :key="i"
              class="mb-5"
              sm="6"
              md="4"
              lg="3"
            >
              <nft :nft="nft" type="history" />
            </b-col>
          </b-row>
        </template>

        <b-card v-else>
          No recent transaction has been found!
        </b-card>
      </section>
    </template>
  </b-container>
</template>

<script>
import Nft from '@/components/nftmarketplace/Nft.vue'

export default {
  name: 'NFTS',

  components: {
    Nft
  },

  data () {
    return {
      featured: [],
      latest: [],
      history: []
    }
  },

  async fetch () {
    this.loading = true

    const [latest, featured, history] = await Promise.all([
      this.$nftm.$get('collectibles/latest', { params: { limit: 4 } }),
      this.$nftm.$get('collectibles/featured', { params: { limit: 4 } }),
      this.$nftm.$get('transactions/history', { params: { types: 'buy', limit: 4 } })
    ])

    this.latest = latest
    this.featured = featured
    this.history = history.map(h => ({ ...h, ...h.series_info }))

    this.loading = false
  },

  head () {
    return {
      title: 'NFT Marketplace'
    }
  }
}
</script>

<style>

</style>
