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
              <div>Base Token</div>
              <div v-if="$auth.loggedIn">
                Balance: {{ baseSymbol ? balances.get(baseSymbol) || 0 : '--' }}
              </div>
            </div>

            <div class="d-flex mt-3">
              <input
                ref="baseQuantity"
                v-model.number="baseQuantity"
                min="0"
                pattern="^[0-9]*[.,]?[0-9]*$"
                autocomplete="off"
                spellcheck="false"
                placeholder="0.0"
                @input="baseQuantityActive = true; quoteQuantityActive = false"
                @change="baseQuantityActive = true; quoteQuantityActive = false"
              >
              <b-button v-show="baseSymbol !== ''" class="btn" @click.prevent="fillMax('baseQuantity')">
                Max
              </b-button>

              <b-button disabled class="btn">
                {{ baseSymbol !== '' ? baseSymbol : 'Select a pool' }}
              </b-button>
            </div>
          </div>

          <div class="swap-currency-input mt-3">
            <div class="d-flex justify-content-between">
              <div>Quote Token</div>
              <div v-if="$auth.loggedIn">
                Balance: {{ quoteSymbol ? balances.get(quoteSymbol) || 0 : '--' }}
              </div>
            </div>

            <div class="d-flex mt-3">
              <input
                ref="quoteQuantity"
                v-model.number="quoteQuantity"
                min="0"
                pattern="^[0-9]*[.,]?[0-9]*$"
                autocomplete="off"
                spellcheck="false"
                placeholder="0.0"
                @input="quoteQuantityActive = true; baseQuantityActive = false"
                @change="quoteQuantityActive = true; baseQuantityActive = false"
              >
              <b-button v-show="quoteSymbol !== ''" class="btn" @click.prevent="fillMax('quoteQuantity')">
                Max
              </b-button>

              <b-button disabled class="btn">
                {{ quoteSymbol !== '' ? quoteSymbol : 'Select a pool' }}
              </b-button>
            </div>
          </div>

          <div v-if="poolInfo && price > 0" class="swap-currency-input mt-3">
            <div class="d-flex justify-content-between">
              <div>Prices</div>
            </div>

            <div class="d-flex mt-3 justify-content-between">
              <div class="badge">
                {{ price }} {{ quoteSymbol }} per {{ baseSymbol }}
              </div>

              <div class="badge">
                {{ toFixedWithoutRounding(1 / price, poolInfo.precision) }} {{ baseSymbol }} per {{ quoteSymbol }}
              </div>
            </div>
          </div>

          <div v-else-if="poolInfo && !price" class="swap-currency-input mt-3">
            <div>You are the first to add liquidity to this pool. You can set the price.</div>

            <div v-if="quoteQuantity > 0 && baseQuantity > 0" class="d-flex mt-3 justify-content-between">
              <div class="badge">
                {{ roundHalfUp(quoteQuantity / baseQuantity, 8) }} {{ quoteSymbol }} per {{ baseSymbol }}
              </div>

              <div class="badge">
                {{ toFixedWithoutRounding(1 / roundHalfUp(quoteQuantity / baseQuantity, 8), 8) }} {{ baseSymbol }} per {{ quoteSymbol }}
              </div>
            </div>
          </div>

          <b-button
            v-if="!$auth.loggedIn"
            class="mt-3"
            block
            variant="primary"
            size="lg"
            @click.prevent="$bvModal.show('loginModal')"
          >
            Login
          </b-button>

          <b-button
            v-else
            :disabled="shouldDisable || btnBusy"
            class="mt-3"
            block
            variant="primary"
            size="lg"
            @click.prevent="addLiquidity"
          >
            <b-spinner v-if="btnBusy" small class="mb-1" /> Add Liquidity
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
  name: 'DieselPoolAdd',

  components: {
    ModelSelect
  },

  async asyncData ({ $config, $sidechain }) {
    const pools = await $sidechain.getMarketPools({ tokenPair: { $regex: `^${$config.TOKEN}:?|:${$config.TOKEN}$`, $options: 'x' } })

    const tokens = Array.from(new Set(pools.map(p => p.tokenPair.split(':')).flat(Infinity)))

    return {
      pools,
      tokens
    }
  },

  data () {
    return {
      pool: null,
      poolInfo: null,

      baseSymbol: '',
      baseQuantity: '',

      quoteSymbol: '',
      quoteQuantity: '',

      baseQuantityActive: false,
      quoteQuantityActive: false,

      balances: new Map(),
      tokensInfo: new Map(),

      price: 0,

      btnBusy: false
    }
  },

  computed: {
    poolPairOptions () {
      return this.pools.map(p => ({ value: p.tokenPair, text: p.tokenPair }))
    },

    shouldDisable () {
      return !this.pool || this.pool === '' || Number(this.baseQuantity) <= 0 || Number(this.quoteQuantity) <= 0 ||
      this.balances.get(this.baseSymbol) < this.baseQuantity || this.balances.get(this.quoteSymbol) < this.quoteQuantity
    }
  },

  watch: {
    '$auth.loggedIn': {
      async handler (loggedIn) {
        if (loggedIn) {
          await this.fetchBalance()
        } else {
          this.balances = new Map()
        }
      }
    },

    async pool () {
      if (this.pool) {
        const [baseSymbol, quoteSymbol] = this.pool.split(':')

        this.baseSymbol = baseSymbol
        this.quoteSymbol = quoteSymbol

        this.baseQuantity = ''
        this.quoteQuantity = ''

        this.baseQuantityActive = false
        this.quoteQuantityActive = false

        await this.fetchPoolInfo()
      }
    },

    baseQuantity (v) {
      if (this.baseQuantityActive && this.price) {
        this.quoteQuantity = this.roundHalfUp(v * this.price, this.tokensInfo.get(this.quoteSymbol).precision)
      }
    },

    quoteQuantity (v) {
      if (this.quoteQuantityActive && this.price) {
        this.baseQuantity = this.roundHalfUp(v * (1 / this.price), this.tokensInfo.get(this.baseSymbol).precision)
      }
    }
  },

  mounted () {
    this.$eventBus.$on('dieselpool-add-successful', this.requestValidateTransaction)

    this.$eventBus.$on('transaction-validated', this.onTransactionValidated)

    this.$eventBus.$on('transaction-broadcast-error', this.onBroadcastError)
  },

  beforeDestroy () {
    this.$eventBus.$off('dieselpool-add-successful', this.requestValidateTransaction)

    this.$eventBus.$off('transaction-validated', this.onTransactionValidated)

    this.$eventBus.$off('transaction-broadcast-error', this.onBroadcastError)
  },

  methods: {
    ...mapActions('pool', ['requestAddLiquidity']),
    ...mapActions('transaction', ['validateTransaction']),

    toFixedWithoutRounding,

    async fetchBalance () {
      if (!this.$auth.loggedIn) { return }

      let balances = new Map()

      try {
        balances = await this.$sidechain.getBalance(this.$auth.user.username, this.tokens)
        balances = new Map(balances.map(b => [b.symbol, Number(b.balance)]))
      } catch (e) {
        console.log(e)
      }

      this.balances = balances
    },

    async fetchPoolInfo () {
      try {
        if (this.pool) {
          const [baseSymbol, quoteSymbol] = this.pool.split(':')

          // eslint-disable-next-line prefer-const
          let [metrics, tokensInfo, [poolInfo]] = await Promise.all([
            this.$sidechain.getMetrics([baseSymbol, quoteSymbol]),
            this.$sidechain.getTokens({ symbol: { $in: [baseSymbol, quoteSymbol] } }),
            this.$sidechain.getMarketPools({ tokenPair: this.pool }),
            this.fetchBalance()
          ])

          metrics = new Map(metrics.map(m => [m.symbol, m.lastPrice]))

          const baseSymbolPrice = Number(baseSymbol === 'SWAP.HIVE' ? 1 : metrics.get(baseSymbol))
          const quoteSymbolPrice = Number(quoteSymbol === 'SWAP.HIVE' ? 1 : metrics.get(quoteSymbol))

          tokensInfo = new Map(tokensInfo.map(m => [m.symbol, m]))

          this.tokensInfo = tokensInfo

          this.poolInfo = {
            ...poolInfo,
            baseQuantity: Number(poolInfo.baseQuantity),
            quoteQuantity: Number(poolInfo.quoteQuantity),
            totalShares: Number(poolInfo.totalShares)
          }

          const price = baseSymbolPrice && quoteSymbolPrice ? this.roundHalfUp(baseSymbolPrice / quoteSymbolPrice, this.poolInfo.precision) : null

          const poolPrice = this.roundHalfUp(this.poolInfo.quoteQuantity / this.poolInfo.baseQuantity, this.poolInfo.precision)

          this.price = poolPrice || price
        }
      } catch (e) {
        console.log(e)
      }
    },

    fillMax (ref) {
      this[ref] = ref === 'baseQuantity' ? this.balances.get(this.baseSymbol) || 0 : this.balances.get(this.quoteSymbol) || 0

      this.$refs[ref].dispatchEvent(new Event('change'))
    },

    addLiquidity () {
      this.btnBusy = true

      this.requestAddLiquidity({ tokenPair: this.pool, baseQuantity: this.baseQuantity, quoteQuantity: this.quoteQuantity })
    },

    async requestValidateTransaction (data) {
      this.loading = true

      await this.validateTransaction(data.id)
    },

    async onTransactionValidated ({ contract, error, action }) {
      this.baseQuantity = ''
      this.quoteQuantity = ''

      this.btnBusy = false

      await this.fetchPoolInfo()

      this.loading = false

      if (!error && contract === 'marketpools' && action === 'addLiquidity') {
        this.$notify({ title: 'Success', text: 'Liquidity has been added.', type: 'success' })
      }
    },

    onBroadcastError () {
      this.btnBusy = false
    }
  },

  timers: {
    fetchPoolInfo: { time: 1 * 60 * 1000, autostart: true, immediate: true, repeat: true }
  }
}
</script>

<style>

</style>
