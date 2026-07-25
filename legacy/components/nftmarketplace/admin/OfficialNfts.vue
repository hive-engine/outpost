<template>
  <div class="official-nfts">
    <h3 class="h4">
      Official NFTs
    </h3><hr>

    <template v-if="loading">
      <loading :small="true" />
    </template>

    <template v-else>
      <b-table
        striped
        responsive
        show-empty
        :items="official"
        :fields="fields"
        sort-by="created_at"
        :sort-desc="true"
        caption-top
      >
        <template #table-caption>
          <div class="text-right font-weight-bold">
            <b-form-checkbox v-model="include_all" :unchecked-value="false">
              Show all NFTs
            </b-form-checkbox>
          </div>
        </template>

        <template #cell(thumbnail)="{item}">
          <nft style="width:150px;height:150px !important;" :small="true" :nft="item" />
        </template>

        <template #cell(name)="{item}">
          <nuxt-link :to="{ name: 'nfts-official-series', params: { series: item.series }}" target="_blank">
            {{ item.name }}
          </nuxt-link>

          <p class="m-0 small text-muted">
            Series: {{ item.series }}
          </p>
        </template>

        <template #cell(price_per_edition)="{item}">
          {{ item.price_per_edition }} {{ settings.official_nft_price_symbol }}
        </template>

        <template #cell(created_at)="{item}">
          {{ new Date(item.created_at).toLocaleString() }}
        </template>
      </b-table>
    </template>
  </div>
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
      official: [],

      include_all: false,

      fields: [
        { key: 'thumbnail', label: '' },
        { key: 'name', label: 'Name' },
        { key: 'editions', label: 'Editions' },
        { key: 'remaining_editions', label: 'Remaining' },
        { key: 'price_per_edition', label: 'Price', sortable: true },
        { key: 'created_at', label: 'Created At', sortable: true }
      ]
    }
  },

  async fetch () {
    this.loading = true

    const params = {
      include_all: this.include_all
    }

    const official = await this.$nftm.$get('collectibles/official', { params })

    this.official = official

    this.loading = false
  },

  computed: {
    ...mapGetters('nftmarketplace', ['settings'])
  },

  watch: {
    async include_all () {
      await this.$fetch()
    }
  }
}
</script>

<style>

</style>
