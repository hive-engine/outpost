<template>
  <div class="dieselpool-add">
    <template v-if="loading">
      <loading />
    </template>

    <template v-else>
      <b-row align-h="center">
        <b-col xl="7" lg="8">
          <div class="swap-currency-input mt-5">
            <div class="d-flex justify-content-between">
              <div>Pool</div>
            </div>

            <div class="mt-3">
              <model-select
                v-model="pool"
                :options="poolPairOptions"
                placeholder="Select a pool"
              />
            </div>
          </div>

          <div class="swap-currency-input mt-3">
            <div class="d-flex justify-content-between">
              <div>Pool Shares</div>
            </div>

            <div class="d-flex align-items-center mt-3">
              <input
                ref="sharesOut"
                v-model.number="sharesOut"
                type="number"
                autocomplete="off"
                spellcheck="false"
                placeholder="50"
                min="0"
                max="100"
                step="1"
                :disabled="!pool"
                @input="sharesOut > 100 ? sharesOut = 100 : sharesOut = parseInt(sharesOut)"
              >
              <div>%</div>
            </div>
          </div>

          <div class="swap-currency-input mt-3">
            <div class="d-flex justify-content-between">
              <div>Estimated Base Token</div>
            </div>

            <div class="d-flex mt-3">
              <input :value="baseOut" placeholder="0.0" :disabled="true">
              <b-button disabled class="btn">
                {{ baseSymbol !== '' ? baseSymbol : 'Select a pool' }}
              </b-button>
            </div>
          </div>

          <div class="swap-currency-input mt-5">
            <div class="d-flex justify-content-between">
              <div>Estimated Quote Token</div>
            </div>

            <div class="d-flex mt-3">
              <input :value="quoteOut" placeholder="0.0" :disabled="true">
              <b-button disabled class="btn">
                {{ quoteSymbol !== '' ? quoteSymbol : 'Select a pool' }}
              </b-button>
            </div>
          </div>

          <b-button
            :disabled="shouldDisable || btnBusy"
            class="mt-3"
            block
            variant="primary"
            size="lg"
            @click.prevent="removeLiquidity"
          >
            <b-spinner v-if="btnBusy" small class="mb-1" /> Remove Liquidity
          </b-button>
        </b-col>
      </b-row>
    </template>
  </div>
</template>

<script>
import { mapActions } from 'vuex'
import { ModelSelect } from 'vue-search-select'
import { toFixedWithoutRounding } from '@/utils'

export default {
  name: 'DieselPoolRemove',

  components: {
    ModelSelect
  },

  middleware: 'auth',

  async asyncData ({ $config, $sidechain, $auth }) {
    const liquidityPositions = await $sidechain.getLiquidityPositions({
      account: $auth.user.username,
      tokenPair: { $regex: `^${$config.TOKEN}:?|:${$config.TOKEN}$`, $options: 'x' }
    })

    const pools = liquidityPositions.map(lp => lp.tokenPair)

    return {
      liquidityPositions,
      pools
    }
  },

  data () {
    return {
      pool: null,
      poolInfo: {},

      sharesOut: '',
      poolShares: 0,

      baseSymbol: '',
      quoteSymbol: '',

      baseOut: 0,
      quoteOut: 0,

      btnBusy: false
    }
  },

  computed: {
    poolPairOptions () {
      return this.pools.map(p => ({ value: p, text: p }))
    },

    shouldDisable () {
      return !this.pool || this.pool === '' || Number(this.sharesOut) <= 0 || this.poolSharesBalance < Number(this.sharesOut)
    }
  },

  watch: {
    async pool () {
      if (this.pool) {
        const [baseSymbol, quoteSymbol] = this.pool.split(':')

        this.baseSymbol = baseSymbol
        this.quoteSymbol = quoteSymbol

        const poolData = this.liquidityPositions.find(lp => lp.tokenPair === this.pool)

        this.poolShares = poolData ? Number(poolData.shares) : 0
        this.sharesOut = ''

        await this.fetchPoolInfo()
      }
    },

    sharesOut () {
      if (this.poolInfo && this.sharesOut > 0) {
        const sharesDelta = (this.poolShares * this.sharesOut) / 100

        this.baseOut = this.roundHalfUp((sharesDelta * this.poolInfo.baseQuantity) / this.poolInfo.totalShares, this.poolInfo.precision)
        this.quoteOut = this.roundHalfUp((sharesDelta * this.poolInfo.quoteQuantity) / this.poolInfo.totalShares, this.poolInfo.precision)
      } else {
        this.baseOut = 0
        this.quoteOut = 0
      }
    }
  },

  mounted () {
    this.$eventBus.$on('dieselpool-remove-successful', this.requestValidateTransaction)

    this.$eventBus.$on('transaction-validated', this.onTransactionValidated)

    this.$eventBus.$on('transaction-broadcast-error', this.onBroadcastError)
  },

  beforeDestroy () {
    this.$eventBus.$off('dieselpool-remove-successful', this.requestValidateTransaction)

    this.$eventBus.$off('transaction-validated', this.onTransactionValidated)

    this.$eventBus.$off('transaction-broadcast-error', this.onBroadcastError)
  },

  methods: {
    ...mapActions('pool', ['requestRemoveLiquidity']),
    ...mapActions('transaction', ['validateTransaction']),

    toFixedWithoutRounding,

    async fetchPoolInfo () {
      try {
        if (this.pool) {
          const [poolInfo] = await this.$sidechain.getMarketPools({ tokenPair: this.pool })

          this.poolInfo = {
            ...poolInfo,
            baseQuantity: Number(poolInfo.baseQuantity),
            quoteQuantity: Number(poolInfo.quoteQuantity),
            totalShares: Number(poolInfo.totalShares)
          }
        }
      } catch (e) {
        console.log(e)
      }
    },

    removeLiquidity () {
      this.btnBusy = true

      return this.requestRemoveLiquidity({ tokenPair: this.pool, sharesOut: this.sharesOut })
    },

    async requestValidateTransaction (data) {
      this.loading = true

      await this.validateTransaction(data.id)
    },

    onTransactionValidated ({ contract, error, action }) {
      this.pool = null
      this.sharesOut = ''

      this.btnBusy = false

      this.loading = false

      if (!error && contract === 'marketpools' && action === 'removeLiquidity') {
        this.$notify({ title: 'Success', text: 'Liquidity has been removed.', type: 'success' })
      }

      this.$nuxt.refresh()
    },

    onBroadcastError () {
      this.btnBusy = false
    }
  }
}
</script>

<style>

</style>
