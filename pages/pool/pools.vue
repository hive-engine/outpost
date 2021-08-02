<template>
  <div class="dieselpool-pools">
    <template v-if="loading">
      <loading />
    </template>

    <template v-else>
      <b-row align-h="between" align-v="center">
        <b-col sm="6" md="4" class="mt-3">
          <b-form-input v-model="filter" trim placeholder="Search Pair..." />
        </b-col>

        <b-col sm="6" md="4" class="text-center text-sm-right mt-3">
          <b-button variant="primary" :to="{name:'pool-create'}">
            Create Pool
          </b-button>
        </b-col>
      </b-row>

      <b-table
        class="mt-3"
        borderless
        responsive
        striped
        sort-icon-left
        :fields="tableFields"
        :per-page="perPage"
        :current-page="currentPage"
        :items="marketPools"
        sort-by="volume"
        :sort-desc="true"
        show-empty
      >
        <template #cell(icons)="{item}">
          <div class="pool-icons">
            <img v-if="item.icons[0] !== ''" :src="item.icons[0].endsWith('.svg') ? `${item.icons[0]}` : `https://images.hive.blog/0x0/${item.icons[0]}`">
            <img v-if="item.icons[1] !== ''" :src="item.icons[1].endsWith('.svg') ? `${item.icons[1]}` : `https://images.hive.blog/0x0/${item.icons[1]}`">
          </div>
        </template>

        <template #cell(totalLiquidity)="{item}">
          {{ item.totalLiquidity.toLocaleString() }} <small>SWAP.HIVE</small><br>
          <small>${{ Number((item.totalLiquidity * hive_price).toFixed(0)).toLocaleString() }}</small>
        </template>

        <template #cell(baseQuantity)="{item}">
          {{ item.baseQuantity.toLocaleString() }} <small>{{ item.baseSymbol }}</small>
        </template>

        <template #cell(quoteQuantity)="{item}">
          {{ item.quoteQuantity.toLocaleString() }} <small>{{ item.quoteSymbol }}</small>
        </template>

        <template #cell(price)="{item}">
          {{ item.basePrice }} <small>{{ item.quoteSymbol }}/{{ item.baseSymbol }}</small><br>
          {{ item.quotePrice }} <small>{{ item.baseSymbol }}/{{ item.quoteSymbol }}</small>
        </template>

        <template #cell(volume)="{item}">
          {{ item.volume.toLocaleString() }} <small>SWAP.HIVE</small><br>
          <small>${{ Number((item.volume * hive_price).toFixed(0)).toLocaleString() }}</small>
        </template>
      </b-table>

      <b-pagination
        v-if="marketPools.length > perPage"
        v-model="currentPage"
        :total-rows="rows"
        :per-page="perPage"
        align="center"
      />
    </template>
  </div>
</template>

<script>
import { mapGetters, mapActions } from 'vuex'
import { toFixedWithoutRounding } from '@/utils'

export default {
  name: 'DieselSwapPools',

  data () {
    return {
      pools: [],
      tokensInfo: new Map(),

      metrics: [],

      perPage: 50,
      currentPage: 1,
      tableFields: [
        { key: 'icons', label: '' },
        { key: 'tokenPair', label: 'Pair' },
        { key: 'totalLiquidity', label: 'Total Liquidity', sortable: true },
        { key: 'baseQuantity', label: 'Base Quantity' },
        { key: 'quoteQuantity', label: 'Quote Quantity' },
        { key: 'price', label: 'Price' },
        { key: 'volume', label: 'Volume', sortable: true }
      ],

      filter: ''
    }
  },

  async fetch () {
    this.loading = true

    const pools = await this.$sidechain.getMarketPools({ tokenPair: { $regex: `^${this.$config.TOKEN}:?|:${this.$config.TOKEN}$`, $options: 'x' } })

    const symbols = Array.from(new Set(pools.map(p => p.tokenPair.split(':')).flat(Infinity)))

    const [tokens, metrics] = await Promise.all([
      this.$sidechain.getTokens({ symbol: { $in: symbols } }),
      this.$sidechain.getMetrics(symbols),
      this.fetchHivePrice()
    ])

    this.tokensInfo = tokens.map(t => ({ symbol: t.symbol, metadata: JSON.parse(t.metadata) }))
    this.tokensInfo = new Map(this.tokensInfo.map(t => [t.symbol, t.metadata.icon ? t.metadata.icon : 'https://cdn.tribaldex.com/tribaldex/token-icons/UNKNOWN.png']))

    this.metrics = metrics
    this.pools = pools

    this.loading = false
  },

  computed: {
    ...mapGetters('nftmarketplace', ['hive_price']),

    mappedMetrics () {
      return new Map(this.metrics.map(m => ([m.symbol, Number(m.lastPrice)])))
    },

    marketPools () {
      let pools = this.pools.map((p) => {
        const [baseSymbol, quoteSymbol] = p.tokenPair.split(':')

        const basePrice = this.mappedMetrics.get(baseSymbol) || 1
        const quotePrice = this.mappedMetrics.get(quoteSymbol) || 1
        const baseQuantity = Number(p.baseQuantity)
        const quoteQuantity = Number(p.quoteQuantity)
        const baseVolume = Number(p.baseVolume)
        const quoteVolume = Number(p.quoteVolume)

        const volume = toFixedWithoutRounding(baseVolume * basePrice + quoteVolume * quotePrice, 0)
        const totalLiquidity = toFixedWithoutRounding(baseQuantity * basePrice + quoteQuantity * quotePrice, 0)

        const icons = [this.tokensInfo.get(baseSymbol), this.tokensInfo.get(quoteSymbol)]

        return {
          ...p,
          icons,
          baseSymbol,
          quoteSymbol,
          totalLiquidity,
          baseQuantity: toFixedWithoutRounding(baseQuantity, 0),
          quoteQuantity: toFixedWithoutRounding(quoteQuantity, 0),
          basePrice: Number(p.basePrice),
          quotePrice: Number(p.quotePrice),
          volume
        }
      })

      if (this.filter !== '') {
        const text = this.filter.toLowerCase()

        pools = pools.filter(p => p.tokenPair.toLowerCase().includes(text))
      }

      return pools
    }
  },

  methods: {
    ...mapActions('nftmarketplace', ['fetchHivePrice'])
  }
}
</script>

<style>

</style>
