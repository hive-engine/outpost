<template>
  <b-container fluid="lg">
    <template v-if="loading">
      <loading />
    </template>

    <template v-else>
      <b-button variant="primary" size="sm" :to="{ name: 'user-gallery', params: { user: $route.params.user } }" class="mt-3 mb-1">
        <fa-icon icon="angle-left" /> Back
      </b-button>

      <b-card class="mt-3">
        <h1 class="h3">
          {{ series.name }}
        </h1>

        <b-row class="mt-3">
          <b-col lg="5" order="2" order-lg="1" class="h-100 mb-3">
            {{ series.description }}

            <div class="mt-3">
              <strong>Collection:</strong> {{ series.collection_name }}
            </div>

            <div class="mt-3">
              <strong>Creator:</strong> <nuxt-link :to="{ name: 'user-gallery', params: { user: series.creator } }">
                @{{ series.creator }}
              </nuxt-link>
            </div>

            <div class="mt-3">
              <strong>Total Edition(s):</strong> {{ series.editions }}
            </div>

            <ul class="mt-3 list-inline">
              <li v-for="(t, i) of series.tags" :key="i" class="list-inline-item">
                <nuxt-link :to="{ name: 'nfts-search', query: { q: t } }">
                  #{{ t }}
                </nuxt-link>
              </li>
            </ul>
          </b-col>

          <b-col lg="7" order="1" order-lg="2" class="h-100 mb-3 text-center text-lg-right">
            <b-img v-if="series.type === 'image'" fluid :src="series.file" />

            <template v-else-if="series.type === 'video'">
              <client-only>
                <vue-plyr>
                  <video controls crossorigin playsinline autoplay>
                    <source :src="series.file">
                  </video>
                </vue-plyr>
              </client-only>
            </template>

            <template v-else-if="series.type === 'audio'">
              <b-img fluid :src="series.thumbnail" />

              <client-only>
                <vue-plyr>
                  <audio controls crossorigin playsinline autoplay>
                    <source :src="series.file">
                  </audio>
                </vue-plyr>
              </client-only>
            </template>

            <div v-if="series.ipfs && series.cid" class="text-center mt-3">
              <a :href="`${$config.IPFS_GATEWAY}/ipfs/${series.cid}`" target="_blank">View on IPFS</a>
            </div>
          </b-col>
        </b-row>
      </b-card>

      <b-card class="mt-3" body-class="p-0">
        <b-card-header>
          <div class="d-flex align-items-center justify-content-between cursor-pointer" @click="listingVisible = !listingVisible">
            <div class="font-weight-bold">
              <fa-icon icon="tags" />&nbsp; &nbsp; Listings
            </div>

            <fa-icon v-if="!listingVisible" icon="angle-down" />
            <fa-icon v-else icon="angle-up" />
          </div>
        </b-card-header>

        <b-collapse id="collapse-1" v-model="listingVisible">
          <b-card-body body-class="p-0">
            <b-table
              borderless
              responsive
              striped
              show-empty
              :per-page="perPage"
              :current-page="currentPage"
              :items="forSale"
              :fields="fields"
              sort-by="price"
              table-class="border-0"
              @input="(items) => currentItems = items"
            >
              <template #cell(account)="{item}">
                <nuxt-link :to="{ name: 'user-collection', params: { user: item.account }}">
                  {{ item.account }}
                </nuxt-link>
              </template>

              <template #cell(rights)="{item}">
                {{ rightsOptions[item.metadata.rights - 1] }}
              </template>

              <template #cell(price)="{item}">
                {{ item.price }} {{ item.symbol }} <span class="text-muted">({{ getUSDPrice(item.price) }})</span>
              </template>

              <template #cell(actions)="{item}">
                <add-to-cart :nft="item" :items="currentItems" />
              </template>
            </b-table>

            <b-row>
              <b-col align-self="center" class="pl-4 mt-3 mb-3">
                <div class="d-flex align-items-center">
                  <div class="mr-2">
                    Per Page:
                  </div>

                  <b-form-select v-model="perPage" size="sm" style="width:100px" :options="perPageOptions" />
                </div>
              </b-col>

              <b-col align-self="center" class="pr-4 mt-3 mb-3">
                <b-pagination
                  v-model="currentPage"
                  class="mb-0"
                  :total-rows="forSale.length"
                  :per-page="perPage"
                  align="right"
                  size="sm"
                />
              </b-col>
            </b-row>
          </b-card-body>
        </b-collapse>
      </b-card>

      <b-card class="mt-3" body-class="p-0">
        <b-card-header>
          <div class="d-flex align-items-center justify-content-between cursor-pointer" @click="historyVisible = !historyVisible">
            <div class="float-left font-weight-bold">
              <fa-icon icon="list" />&nbsp; &nbsp; History
            </div>

            <fa-icon v-if="!historyVisible" icon="angle-down" />
            <fa-icon v-else icon="angle-up" />
          </div>
        </b-card-header>

        <b-collapse id="collapse-2" v-model="historyVisible">
          <b-card-body body-class="p-0">
            <b-list-group class="transaction-history-list">
              <b-list-group-item v-for="(h,i) of history" :key="i">
                <template v-if="h.type === 'buy'">
                  <nuxt-link :to="{name:'user-collection', params:{user: h.account}}">
                    @{{ h.account }}
                  </nuxt-link> bought edition #{{ h.data.edition }} from <nuxt-link :to="{name:'user-collection', params:{user: h.data.seller}}">
                    @{{ h.data.seller }}
                  </nuxt-link>  for {{ parseFloat(h.data.price).toFixed(3) }} {{ h.data.symbol }}
                </template>

                <template v-else-if="h.type === 'transfer'">
                  <nuxt-link :to="{name:'user-collection', params:{user: h.account}}">
                    @{{ h.account }}
                  </nuxt-link> transferred edition #{{ h.data.edition }} to <nuxt-link :to="{name:'user-collection', params:{user: h.data.to}}">
                    @{{ h.data.to }}
                  </nuxt-link>
                </template>

                <template v-else-if="h.type === 'sell'">
                  <nuxt-link :to="{name:'user-collection', params:{user: h.account}}">
                    @{{ h.account }}
                  </nuxt-link> listed edition #{{ h.data.edition }} for sale for {{ parseFloat(h.data.price).toFixed(3) }} {{ h.data.symbol }}
                </template>

                <template v-else-if="h.type === 'burn'">
                  <nuxt-link :to="{name:'user-collection', params:{user: h.account}}">
                    @{{ h.account }}
                  </nuxt-link> burned edition #{{ h.data.edition }}
                </template>

                <template v-else-if="h.type === 'issue'">
                  <nuxt-link :to="{name:'user-collection', params:{user: h.account}}">
                    @{{ h.account }}
                  </nuxt-link> tokenized {{ h.data.editions }} editions
                </template><br>

                <timeago class="text-muted" :datetime="new Date(h.timestamp)" :auto-update="60" />

                <a class="small" :href="`${(h.sidechain_block) ? $config.SIDECHAIN_EXPLORER: 'https://hiveblocks.com'}/tx/${h.trx_id}`" target="_blank">[view tx]</a>
              </b-list-group-item>
            </b-list-group>
          </b-card-body>
        </b-collapse>
      </b-card>
    </template>
  </b-container>
</template>

<script>
import { mapGetters, mapActions } from 'vuex'
import NFTMMixin from '@/mixins/nftmarketplace'
import AddToCart from '@/components/nftmarketplace/AddToCart.vue'

export default {
  name: 'Series',

  components: {
    AddToCart
  },

  mixins: [NFTMMixin],

  async asyncData ({ $nftm, params, error }) {
    let series = null

    try {
      series = await $nftm.$get('collectibles/info', { params: { series: params.series } })
    } catch {
      //
    }

    if (!series) {
      return error({ statusCode: 404, message: 'NFT you are looking for can not be found!' })
    }

    return {
      series
    }
  },

  data () {
    return {
      forSale: [],
      history: [],

      fields: [
        { key: 'account', label: 'Owner' },
        { key: 'edition', label: 'Edition #', sortable: true },
        { key: 'rights', label: 'Rights' },
        { key: 'price', label: 'Price', sortable: true },
        { key: 'actions', label: '' }
      ],
      perPage: 10,
      perPageOptions: [10, 20, 50, 100],
      currentPage: 1,
      rightsOptions: ['Private', 'Limited Production Rights'],

      currentItems: [],

      listingVisible: true,
      historyVisible: true
    }
  },

  async fetch () {
    this.loading = true

    const [forSale, history] = await Promise.all([
      this.fetchForSale({ account: this.$route.params.user, 'grouping.series': this.$route.params.series }),
      this.$nftm.$get('transactions/history', { params: { series: this.$route.params.series, types: 'issue,buy,burn' } })
    ])

    this.forSale = forSale.map(s => ({ ...s, name: this.series.name, thumbnail: this.series.thumbnail }))
    this.history = history

    this.loading = false
  },

  head () {
    return {
      title: this.series.name,
      meta: [
        { hid: 'description', name: 'description', content: this.series.description },
        { hid: 'og-type', property: 'og:type', content: 'website' },
        { hid: 'og-title', property: 'og:title', content: this.series.name },
        { hid: 'og-image', property: 'og:image', content: this.series.thumbnail },
        { hid: 'og-description', property: 'og:description', content: this.series.description },
        { hid: 'twitter-card', name: 'twitter:card', content: 'summary_large_image' },
        { hid: 'twitter-title', name: 'twitter:title', content: this.series.name },
        { hid: 'twitter-description', name: 'twitter:description', content: this.series.description },
        { hid: 'twitter-image', name: 'twitter:image', content: this.series.thumbnail }
      ]
    }
  },

  computed: {
    ...mapGetters('nftmarketplace', ['token_price'])
  },

  mounted () {
    this.$eventBus.$on(['nft-buy-successful', 'nft-sell-successful', 'nft-cancel-sell-successful', 'nft-change-price-successful'], this.requestValidateTransaction)

    this.$eventBus.$on('transaction-validated', this.$fetch)
  },

  beforeDestroy () {
    this.$eventBus.$off(['nft-buy-successful', 'nft-sell-successful', 'nft-cancel-sell-successful', 'nft-change-price-successful'], this.requestValidateTransaction)
    this.$eventBus.$off('transaction-validated', this.$fetch)
  },

  methods: {
    ...mapActions('nftmarketplace', ['fetchForSale']),
    ...mapActions('transaction', ['validateTransaction']),

    getUSDPrice (hivePrice) {
      return `$${Number(Number(hivePrice) * this.token_price).toFixed(3)}`
    }
  }
}
</script>

<router>
  {
    name:'user-gallery-series',
    path: '/@:user/gallery/:series'
  }
</router>

<style>

</style>
