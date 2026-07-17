<template>
  <b-container fluid="lg">
    <template v-if="loading">
      <loading />
    </template>

    <template v-else>
      <template v-if="series.length > 0">
        <b-row class="mt-3">
          <b-col
            v-for="(nft,i) of series"
            :key="i"
            class="mb-5"
            sm="6"
            md="4"
            lg="3"
          >
            <nft :nft="series_info[nft]" route="user-gallery-series" :params="{user:$route.params.user, series: nft}" />
          </b-col>
        </b-row>
      </template>

      <b-card v-else class="mt-5">
        @{{ $route.params.user }} doesn't have any NFT for sale.
      </b-card>
    </template>
  </b-container>
</template>

<script>
import { mapActions, mapGetters } from 'vuex'
import Nft from '@/components/nftmarketplace/Nft.vue'

export default {
  name: 'UserGallery',

  components: {
    Nft
  },

  data () {
    return {
      series: []
    }
  },

  async fetch () {
    this.loading = true

    const collection = await this.fetchCollection({ account: 'nftmarket', previousAccount: this.$route.params.user })

    const allSeries = Array.from(new Set(collection.map(c => c.series)))

    this.series = allSeries

    await this.fetchSeriesInfo(allSeries)

    this.loading = false
  },

  head () {
    return {
      title: `@${this.$route.params.user}'s NFT Gallery`
    }
  },

  computed: {
    ...mapGetters('nftmarketplace', ['series_info'])
  },

  methods: {
    ...mapActions('nftmarketplace', ['fetchCollection', 'fetchSeriesInfo'])
  }
}
</script>

<router>
  {
    name:'user-gallery',
    path: '/@:user/gallery'
  }
</router>

<style>

</style>
