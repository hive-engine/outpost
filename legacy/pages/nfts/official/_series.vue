<template>
  <b-container>
    <template v-if="loading">
      <loading />
    </template>

    <template v-else>
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

            <div class="mt-3">
              <strong>Remaining Edition(s):</strong> {{ remainingEditions }}
            </div>

            <div v-if="remainingEditions > 0" class="alert alert-info p-2 mt-5 mb-5">
              <b-form-row>
                <b-col>
                  <b-form-group label="Edition">
                    <b-input-group :append="`/ ${remainingEditions}`">
                      <b-form-input v-model="editions" type="number" min="1" :max="remainingEditions" /></b-form-input>
                    </b-input-group>
                  </b-form-group>
                </b-col>

                <b-col>
                  <b-form-group label="Total">
                    <b-input-group :append="settings.official_nft_price_symbol">
                      <b-form-input readonly :value="totalPrice" />
                    </b-input-group>
                  </b-form-group>
                </b-col>

                <b-col v-if="$auth.loggedIn" cols="12">
                  Your balance: {{ balance }} {{ settings.official_nft_price_symbol }}
                </b-col>
              </b-form-row>

              <b-button v-if="$auth.loggedIn" :disabled="balance < totalPrice" class="mt-2" variant="primary" @click.prevent="requestPayment">
                Buy NFT
              </b-button>

              <b-button v-else class="mt-2" variant="primary" @click.prevent="$bvModal.show('loginModal')">
                Login
              </b-button>
            </div>

            <ul class="mt-3 list-inline">
              <li v-for="(t, i) of series.tags" :key="i" class="list-inline-item">
                <nuxt-link :to="{ name: 'nfts-search', query: { q: t } }">
                  #{{ t }}
                </nuxt-link>
              </li>
            </ul>

            <div v-if="$auth.loggedIn">
              <b-button size="sm" variant="warning" @click="$bvModal.show('reportCollectibleModal')">
                Report
              </b-button>
            </div>
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
          </b-col>
        </b-row>
      </b-card>

      <b-card v-if="remainingEditions <= 0" class="mt-3" body-class="p-0">
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

                <template v-else-if="h.type === 'buy_official_nft'">
                  <nuxt-link :to="{name:'user-collection', params:{user: h.account}}">
                    @{{ h.account }}
                  </nuxt-link> has been issued edition #{{ h.data.editions.join(', #') }} for {{ parseFloat(h.data.price).toFixed(3) }} {{ h.data.symbol }}
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

      <report :series="series.series" />
    </template>
  </b-container>
</template>

<script>
import { mapGetters, mapActions } from 'vuex'
import NFTMMixin from '@/mixins/nftmarketplace'
import AddToCart from '@/components/nftmarketplace/AddToCart.vue'
import Report from '@/components/nftmarketplace/modals/Report.vue'
import { toFixedWithoutRounding } from '~/utils'

export default {
  name: 'OfficialSeries',

  components: {
    AddToCart,
    Report
  },

  mixins: [NFTMMixin],

  async asyncData ({ $nftm, params, error }) {
    let series = null

    try {
      series = await $nftm.$get('collectibles/info', { params: { series: params.series } })
    } catch {
      //
    }

    if (!series || !series.official) {
      return error({ statusCode: 404, message: 'NFT you are looking for can not be found!' })
    }

    return {
      series
    }
  },

  data () {
    return {
      editions: 1,
      balance: 0,

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

    const requests = [
      this.$nftm.$get('transactions/history', { params: { series: this.$route.params.series, types: 'issue,buy_official_nft,burn' } }),
      this.fetchTokenBalance()
    ]

    if (this.remainingEditions <= 0) {
      requests.push(this.fetchForSale({ 'grouping.series': this.$route.params.series }))
    }

    const [history,, forSale] = await Promise.all(requests)

    this.history = history

    if (forSale) {
      this.forSale = forSale.map(s => ({ ...s, name: this.series.name, thumbnail: this.series.thumbnail }))
    }

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
    ...mapGetters('nftmarketplace', ['settings', 'token_price']),

    remainingEditions () {
      return this.series.editions - this.series.editions_issued
    },

    totalPrice () {
      return toFixedWithoutRounding(this.editions * this.series.price_per_edition, this.settings.official_nft_price_symbol_precision)
    }
  },

  watch: {
    '$auth.loggedIn': {
      async handler (v) {
        if (v) {
          await this.fetchTokenBalance()
        }
      }
    }
  },

  mounted () {
    this.$eventBus.$on(['nft-buy-successful', 'nft-cancel-sell-successful', 'nft-change-price-successful'], this.requestValidateTransaction)

    this.$eventBus.$on('transaction-validated', this.$fetch)

    this.$eventBus.$on('tokens-transfer-successful', async (data) => {
      this.loading = true
      this.editions = 1

      await this.validateTokenIssuance(data.id)
    })

    this.$eventBus.$on('nftmarketplace-mint-tokens-validated', async () => {
      await this.$nuxt.refresh()

      this.$notify({ title: 'Success', text: 'You have been issued the NFT(s).', type: 'success' })
    })

    this.$eventBus.$on('nftmarketplace-mint-tokens-not-validated', async () => {
      await this.$nuxt.refresh()

      this.$notify({ title: 'Warning', text: 'Automatic verification has failed. Please verify manually.', type: 'warn' })
    })
  },

  beforeDestroy () {
    this.$eventBus.$off(['nft-buy-successful', 'nft-cancel-sell-successful', 'nft-change-price-successful'], this.requestValidateTransaction)
    this.$eventBus.$off('transaction-validated', this.$fetch)

    this.$eventBus.$off(['tokens-transfer-successful', 'nftmarketplace-mint-tokens-validated', 'nftmarketplace-mint-tokens-not-validated'])
  },

  methods: {
    ...mapActions('nftmarketplace', ['fetchForSale', 'validateTokenIssuance']),
    ...mapActions('user', ['requestTokenAction']),

    async fetchTokenBalance () {
      if (!this.$auth.loggedIn) { return }

      let balance = 0

      try {
        balance = await this.$sidechain.getBalance(this.$auth.user.username, this.settings.official_nft_price_symbol)
        balance = balance ? Number(balance.balance) : 0
      } catch {
        //
      }

      this.balance = balance
    },

    requestPayment () {
      const { account, site, official_nft_price_symbol: priceSymbol } = this.settings

      const payload = {
        action: 'transfer',
        symbol: priceSymbol,
        amount: this.totalPrice,
        to: account,
        memo: JSON.stringify({
          action: 'mint-official',
          site,
          series: this.series.series,
          editions: this.editions
        })
      }

      this.requestTokenAction(payload)
    },

    getUSDPrice (hivePrice) {
      return `$${Number(Number(hivePrice) * this.token_price).toFixed(3)}`
    }
  },

  timers: {
    fetchTokenBalance: { time: 3 * 60 * 1000, autostart: true, immediate: true, repeat: true }
  }
}
</script>

<style>

</style>
