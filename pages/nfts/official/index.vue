<template>
  <b-container>
    <template v-if="loading">
      <loading />
    </template>

    <template v-else>
      <template v-if="settings && settings.official_nft_enabled && official.length >0">
        <b-row class="mt-3">
          <b-col
            v-for="(nft,i) of official"
            :key="i"
            class="mb-5"
            sm="6"
            md="4"
            lg="3"
          >
            <nft :nft="nft" route="nfts-official-series" />
          </b-col>
        </b-row>
      </template>

      <b-card v-else class="mt-5">
        No Official NFT has been found!
      </b-card>
    </template>
  </b-container>
</template>

<script>
import { mapGetters } from 'vuex'
import Nft from '@/components/nftmarketplace/Nft.vue'

export default {
  name: 'OfficialNFTs',

  components: {
    Nft
  },

  data () {
    return {
      official: []
    }
  },

  async fetch () {
    this.loading = true

    const official = await this.$nftm.$get('collectibles/official')

    this.official = official

    this.loading = false
  },

  head () {
    return {
      title: 'Official NFTs'
    }
  },

  computed: {
    ...mapGetters('nftmarketplace', ['settings'])
  }
}
</script>

<style>

</style>
