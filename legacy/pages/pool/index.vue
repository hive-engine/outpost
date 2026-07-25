<template>
  <div class="dieselpool-swap">
    <template v-if="loading">
      <loading />
    </template>

    <template v-else>
      <b-row align-h="center">
        <b-col xl="7" lg="8">
          <div class="swap-currency-input mt-5">
            <div class="d-flex justify-content-between">
              <div>From</div>
              <div v-if="$auth.loggedIn">
                Balance: {{ fromSymbol ? balances.get(fromSymbol) || 0 : '--' }}
              </div>
            </div>

            <div class="d-flex mt-3">
              <input
                ref="fromAmount"
                v-model.number="fromAmount"
                type="number"
                min="0"
                pattern="^[0-9]*[.,]?[0-9]*$"
                autocomplete="off"
                spellcheck="false"
                placeholder="0.0"
                @input="fromAmountActive = true; toAmountActive = false"
                @change="fromAmountActive = true; toAmountActive = false"
              >

              <button v-show="fromSymbol !== ''" class="btn" @click.prevent="fillMax('fromAmount')">
                Max
              </button>

              <button class="btn" @click.prevent="showModal('from')">
                {{ fromSymbol === ''? 'Select a token' : fromSymbol }} <fa-icon icon="chevron-down" />
              </button>
            </div>
          </div>

          <div class="text-center mt-3">
            <button class="btn border" @click.prevent="swapPosition">
              <fa-icon icon="long-arrow-alt-up" />
              <fa-icon icon="long-arrow-alt-down" />
            </button>
          </div>

          <div class="swap-currency-input mt-3">
            <div class="d-flex justify-content-between">
              <div>To</div>
              <div v-if="$auth.loggedIn">
                Balance: {{ toSymbol ? balances.get(toSymbol) || 0 : '--' }}
              </div>
            </div>

            <div class="d-flex mt-3">
              <input
                ref="toAmount"
                v-model.number="toAmount"
                min="0"
                type="number"
                pattern="^[0-9]*[.,]?[0-9]*$"
                autocomplete="off"
                spellcheck="false"
                placeholder="0.0"
                @input="toAmountActive = true; fromAmountActive = false"
                @change="toAmountActive = true; fromAmountActive = false"
              >
              <button v-show="toSymbol !== ''" class="btn" @click.prevent="fillMax('toAmount')">
                Max
              </button>
              <button class="btn" @click.prevent="showModal('to')">
                {{ toSymbol === ''? 'Select a token' : toSymbol }} <fa-icon icon="chevron-down" />
              </button>
            </div>
          </div>

          <transition-group name="fade" mode="out-in">
            <div v-if="!pool && fromSymbol && toSymbol" key="poolExists" class="swap-currency-input mt-3">
              <p class="m-0 text-warning text-center">
                No liquidity pool found between {{ fromSymbol }} and {{ toSymbol }}!
              </p>
            </div>

            <div v-else-if="pool && !isLiquid" key="isLiquid" class="swap-currency-input mt-3">
              <p class="m-0 text-warning text-center">
                Insufficent liquidity for this trade.
              </p>
            </div>

            <div v-else-if="price > 0 && (fromAmount > 0 || toAmount > 0 )" key="price" class="swap-currency-input mt-3">
              <div class="d-flex flex-wrap justify-content-between">
                <div>
                  <div class="mb-2">
                    Prices
                  </div>
                  <div class="badge px-0 text-left">
                    <p class="mb-1">
                      {{ fromSymbolPrice }} {{ toSymbol }} per {{ fromSymbol }}
                    </p>

                    <p class="mb-1">
                      {{ toSymbolPrice }} {{ fromSymbol }} per {{ toSymbol }}
                    </p>
                  </div>
                </div>

                <div>
                  <div class="text-sm-right mb-2">
                    Liquidity
                  </div>
                  <div class="badge px-0 text-left text-sm-right">
                    <p class="mb-1">
                      {{ baseSymbol }}: {{ toFixedWithoutRounding(poolInfo.baseQuantity, poolInfo.precision) }}
                    </p>
                    <p class="mb-1">
                      {{ quoteSymbol }}: {{ toFixedWithoutRounding(poolInfo.quoteQuantity, poolInfo.precision) }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </transition-group>

          <div class="swap-currency-input mt-3">
            <div class="d-flex justify-content-between">
              <div>Slippage</div>
            </div>

            <div class="d-flex flex-wrap mt-3 justify-content-between align-items-center">
              <div class="radio-buttons">
                <label v-for="(r,i) of slippageOptions" :key="i" :class="{'active': maxSlippage === r.value}">
                  <input v-model.number="maxSlippage" type="radio" :value="r.value"> {{ r.text }}
                </label>
              </div>

              <div>
                <input
                  v-model.number="maxSlippage"
                  type="number"
                  :min="0.5"
                  :max="49.99"
                  step="any"
                  style="background-color:rgba(0,0,0,0.15);padding:0.3rem;border-radius:10px;width:50px;margin-bottom:0.5rem;"
                  pattern="^[0-9]*[.,]?[0-9]*$"
                  autocomplete="off"
                  spellcheck="false"
                  placeholder="0.0"
                  class="text-center"
                >
                <fa-icon icon="percent" style="font-size: 13px; margin-bottom:1px" />
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
            class="mt-3"
            block
            variant="primary"
            size="lg"
            :disabled="disableSwapButton || btnBusy"
            @click.prevent="swapTokens"
          >
            <b-spinner v-if="btnBusy" small class="mb-1" /> Swap
          </b-button>

          <div v-if="minimumReceived >0" class="swap-currency-input mt-3">
            <div class="d-flex align-items-center justify-content-between mb-2">
              <div class="mr-2">
                Minimum Received <a v-b-tooltip title="Transaction will revert if there is a big unfavorable price movement before it is confirmed." class="cursor-pointer"><fa-icon icon="info-circle" /></a>
              </div>

              <div class="text-right">
                {{ minimumReceived }} {{ toSymbol }}
              </div>
            </div>
            <div class="d-flex align-items-center justify-content-between mb-2">
              <div class="mr-2">
                Price Impact <a v-b-tooltip title="The difference between market price and estimated price due to trade size." class="cursor-pointer"><fa-icon icon="info-circle" /></a>
              </div>

              <div class="text-right" :class="{'text-success': priceImpact < 0.20, 'text-danger': priceImpact > 0.20}">
                <template v-if="priceImpact < 0.0001">
                  ‹ 0.01
                </template>
                <template v-else>
                  {{ (priceImpact * 100).toFixed(2) }}
                </template>%
              </div>
            </div>
            <div class="d-flex align-items-center justify-content-between">
              <div class="mr-2">
                Liquidity Provider Fee <a v-b-tooltip :title="`For each trade a ${lpFeeInPct}% fee is paid to the liquidity providers.`" class="cursor-pointer inline-block"><fa-icon icon="info-circle" /></a>
              </div>

              <div class="text-right">
                {{ totalTradeFee }} {{ toSymbol }}
              </div>
            </div>
          </div>
        </b-col>
      </b-row>

      <b-modal id="tokenSelectionModal" centered title="Select a token" hide-footer scrollable>
        <b-form-input ref="filterInput" v-model="filter" class="mb-5" placeholder="Search symbol" />

        <div v-for="(token, t) of availableTokens" :key="t" :class="{'text-muted': isTokenDisabled(token.symbol), 'cursor-pointer': !isTokenDisabled(token.symbol)}" class="d-flex align-items-center justify-content-between pt-1 pb-1 mb-1" @click.prevent="selectToken(token.symbol)">
          <div class="mr-2">
            {{ token.symbol }}
          </div>
          <div>
            {{ token.balance }}
          </div>
        </div>
      </b-modal>
    </template>
  </div>
</template>

<script>
import { mapActions } from 'vuex'
import { toFixedWithoutRounding } from '@/utils'

export default {
  name: 'DieselPoolSwap',

  async asyncData ({ $config, $sidechain }) {
    let tradeFeeMul = 0.9975

    const [pools, params] = await Promise.all([
      $sidechain.getMarketPools({ tokenPair: { $regex: `^${$config.TOKEN}:?|:${$config.TOKEN}$`, $options: 'x' } }),
      $sidechain.getContractParams('marketpools')
    ])

    if (params.tradeFeeMul) {
      tradeFeeMul = Number(params.tradeFeeMul)
    }

    const tokens = Array.from(new Set(pools.map(p => p.tokenPair.split(':')).flat(Infinity)))

    return {
      pools,
      tokens,
      tradeFeeMul
    }
  },

  data () {
    return {
      filter: '',

      fromSymbol: '',
      fromAmount: '',

      toAmount: '',
      toSymbol: '',

      price: 0,

      maxSlippage: 0.5,

      fromAmountActive: false,
      toAmountActive: false,

      balances: new Map(),
      tokensInfo: new Map(),

      tokenSelectionType: null,

      poolInfo: {},
      baseSymbol: '',
      quoteSymbol: '',

      slippageOptions: [
        { text: '0.5%', value: 0.5 },
        { text: '1%', value: 1 },
        { text: '5%', value: 5 },
        { text: '10%', value: 10 },
        { text: '25%', value: 25 },
        { text: '49%', value: 49 }],

      totalTradeFee: 0,

      btnBusy: false
    }
  },

  computed: {
    availableTokens () {
      let tokens = this.tokens.map((symbol) => {
        return {
          symbol,
          balance: this.balances.get(symbol) || 0
        }
      })
        .sort((a, b) => b.balance - a.balance)

      if (this.filter !== '') {
        tokens = tokens.filter(t => t.symbol.toLowerCase().includes(this.filter.toLowerCase()))
      }

      return tokens
    },

    tokenPair () {
      return `${this.fromSymbol}:${this.toSymbol}`
    },

    reversePair () {
      return `${this.toSymbol}:${this.fromSymbol}`
    },

    pool () {
      return this.pools.find(p => [this.tokenPair, this.reversePair].includes(p.tokenPair))
    },

    isLiquid () {
      if (!this.fromSymbol || this.fromSymbol === '' || !this.toSymbol || this.toSymbol === '') {
        return true
      }

      const fromSymbolLiquidity = (this.baseSymbol === this.fromSymbol) ? Number(this.poolInfo.baseQuantity) : Number(this.poolInfo.quoteQuantity)
      const toSymbolLiquidity = (this.baseSymbol === this.toSymbol) ? Number(this.poolInfo.baseQuantity) : Number(this.poolInfo.quoteQuantity)

      return fromSymbolLiquidity >= this.fromAmount && toSymbolLiquidity >= this.toAmount
    },

    minimumReceived () {
      if (this.toAmount > 0) {
        return toFixedWithoutRounding(this.toAmount * (1 - this.maxSlippage / 100), this.tokensInfo.get(this.toSymbol).precision)
      }

      return 0
    },

    priceImpact () {
      if (this.price > 0) {
        const basePrice = this.price
        const quotePrice = 1 / this.price

        return Math.abs(
          (this.toSymbol === this.baseSymbol)
            ? (basePrice - (this.fromAmount / this.toAmount)) / basePrice
            : (quotePrice - (this.fromAmount / this.toAmount)) / quotePrice
        )
      }

      return 0
    },

    disableSwapButton () {
      return false
    },

    lpFeeInPct () {
      return this.roundHalfUp((1 - this.tradeFeeMul) * 100, 2)
    },

    fromSymbolPrice () {
      if (this.price > 0 && (this.fromAmount > 0 || this.toAmount > 0)) {
        const { price } = this.getExactInputPrice(this.fromSymbol, this.fromAmount)

        return this.toFixedWithoutRounding(price / this.fromAmount, this.poolInfo.precision)
      }

      return 0
    },

    toSymbolPrice () {
      if (this.price > 0 && (this.fromAmount > 0 || this.toAmount > 0)) {
        const { price } = this.getExactOutputPrice(this.toSymbol, this.toAmount)

        return this.toFixedWithoutRounding(price / this.toAmount, this.poolInfo.precision)
      }

      return 0
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

    fromAmount (v) {
      if (this.fromAmountActive && this.poolInfo.basePrice) {
        const { price, fee } = this.getExactInputPrice(this.fromSymbol, v)

        this.toAmount = this.roundHalfUp(price, this.tokensInfo.get(this.toSymbol).precision)
        this.totalTradeFee = this.roundHalfUp(fee, this.tokensInfo.get(this.toSymbol).precision)
      }
    },

    toAmount (v) {
      if (this.toAmountActive && this.poolInfo.basePrice) {
        const { price } = this.getExactOutputPrice(this.toSymbol, v)

        const fee = this.toAmount * (1 - this.tradeFeeMul)

        this.fromAmount = this.roundHalfUp(price, this.tokensInfo.get(this.fromSymbol).precision)
        this.totalTradeFee = this.roundHalfUp(fee, this.tokensInfo.get(this.toSymbol).precision)
      }
    },

    poolInfo () {
      if (this.fromSymbol !== '' && this.fromAmount > 0 && this.toSymbol !== '' && this.toAmount > 0) {
        const price = this.getExactInputPrice(this.fromSymbol, this.fromAmount)

        this.toAmount = this.roundHalfUp(price, this.tokensInfo.get(this.toSymbol).precision)
      }
    },

    async tokenPair () {
      this.price = 0

      await this.fetchPoolInfo()
    }
  },

  created () {
    const { from, to } = this.$route.query

    if (from && to) {
      if (from && this.tokens.includes(from)) {
        this.fromSymbol = from.toUpperCase()
      }

      if (to && this.tokens.includes(to) && to !== from) {
        this.toSymbol = to.toUpperCase()
      }

      this.$router.replace({ query: null })
    }
  },

  mounted () {
    this.$root.$on('bv::modal::shown', this.onModalShown)

    this.$root.$on('bv::modal::hidden', this.onModalHidden)

    this.$eventBus.$on('dieselpool-swap-successful', this.requestValidateTransaction)

    this.$eventBus.$on('transaction-validated', this.onTransactionValidated)

    this.$eventBus.$on('transaction-broadcast-error', this.onBroadcastError)
  },

  beforeDestroy () {
    this.$root.$off('bv::modal::shown', this.onModalShown)

    this.$root.$off('bv::modal::hidden', this.onModalHidden)

    this.$eventBus.$off('dieselpool-swap-successful', this.requestValidateTransaction)

    this.$eventBus.$off('transaction-validated', this.onTransactionValidated)

    this.$eventBus.$off('transaction-broadcast-error', this.onBroadcastError)
  },

  methods: {
    ...mapActions('pool', ['requestSwapTokens']),
    ...mapActions('transaction', ['validateTransaction']),

    toFixedWithoutRounding,

    fillMax (ref) {
      this[ref] = ref === 'fromAmount' ? this.balances.get(this.fromSymbol) || 0 : this.balances.get(this.toSymbol) || 0

      this.$refs[ref].dispatchEvent(new Event('change'))
    },

    showModal (type) {
      this.tokenSelectionType = type

      this.$bvModal.show('tokenSelectionModal')
    },

    selectToken (token) {
      if (this.tokenSelectionType === 'from') {
        this.fromSymbol = token
      } else {
        this.toSymbol = token
      }

      this.$bvModal.hide('tokenSelectionModal')
    },

    swapPosition () {
      const toSymbol = this.toSymbol
      const fromSymbol = this.fromSymbol
      const toAmount = this.toAmount
      const fromAmount = this.fromAmount

      this.toSymbol = fromSymbol
      this.fromSymbol = toSymbol
      this.toAmount = fromAmount
      this.fromAmount = toAmount
    },

    swapTokens () {
      this.btnBusy = true

      this.requestSwapTokens({ tokenPair: this.poolInfo.tokenPair, tokenSymbol: this.fromSymbol, tokenAmount: this.fromAmount, minAmountOut: this.minimumReceived })
    },

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
        if (this.fromSymbol && this.fromSymbol !== '' && this.toSymbol && this.toSymbol !== '' && this.pool) {
          const [baseSymbol, quoteSymbol] = this.pool.tokenPair.split(':')
          this.baseSymbol = baseSymbol
          this.quoteSymbol = quoteSymbol

          const [tokensInfo, [poolInfo]] = await Promise.all([
            this.$sidechain.getTokens({ symbol: { $in: [baseSymbol, quoteSymbol] } }),
            this.$sidechain.getMarketPools({ tokenPair: this.pool.tokenPair })
          ])

          this.tokensInfo = new Map(tokensInfo.map(m => [m.symbol, m]))

          this.poolInfo = poolInfo

          const poolPrice = this.roundHalfUp(this.poolInfo.quoteQuantity / this.poolInfo.baseQuantity, this.poolInfo.precision)

          this.price = poolPrice
        }
      } catch (e) {
        console.log(e)
      }
    },

    async fetchBalanceAndPool () {
      await Promise.all([this.fetchBalance(), this.fetchPoolInfo()])

      if (this.fromSymbol && this.fromSymbol !== '' && this.toSymbol && this.toSymbol !== '' && this.poolInfo) {
        const { price, fee } = this.getExactInputPrice(this.fromSymbol, this.fromAmount)

        this.toAmount = this.roundHalfUp(price, this.tokensInfo.get(this.toSymbol).precision)
        this.totalTradeFee = this.roundHalfUp(fee, this.tokensInfo.get(this.toSymbol).precision)
      }
    },

    getExactInputPrice (symbol, value) {
      const estimatedPrice = (symbol === this.baseSymbol)
        ? (value * Number(this.poolInfo.quoteQuantity)) / (Number(this.poolInfo.baseQuantity) + value)
        : (value * Number(this.poolInfo.baseQuantity)) / (Number(this.poolInfo.quoteQuantity) + value)

      const price = estimatedPrice * this.tradeFeeMul
      const fee = estimatedPrice - price

      return { price, fee }
    },

    getExactOutputPrice (symbol, value) {
      const estimatedPrice = (symbol === this.baseSymbol)
        ? (value * Number(this.poolInfo.quoteQuantity)) / (Number(this.poolInfo.baseQuantity) - value)
        : (value * Number(this.poolInfo.baseQuantity)) / (Number(this.poolInfo.quoteQuantity) - value)

      const price = estimatedPrice * this.tradeFeeMul
      const fee = estimatedPrice - price

      return { price, fee }
    },

    isTokenDisabled (token) {
      return this.fromSymbol === token || this.toSymbol === token
    },

    onModalShown (btnEvent, modalId) {
      if (modalId === 'tokenSelectionModal') {
        this.$refs.filterInput.focus()
      }
    },

    onModalHidden (btnEvent, modalId) {
      if (modalId === 'tokenSelectionModal') {
        this.filter = ''
      }
    },

    async requestValidateTransaction (data) {
      this.loading = true

      await this.validateTransaction(data.id)
    },

    async onTransactionValidated ({ error, contract, action }) {
      this.fromAmount = ''
      this.toAmount = ''

      this.btnBusy = false

      await this.fetchBalanceAndPool()

      this.loading = false

      if (!error && contract === 'marketpools' && action === 'swapTokens') {
        this.$notify({ title: 'Success', text: 'Swap has been successful.', type: 'success' })
      }
    },

    onBroadcastError () {
      this.btnBusy = false
    }
  },

  timers: {
    fetchBalanceAndPool: { time: 1 * 60 * 1000, immediate: true, autostart: true, repeat: true }
  }
}
</script>

<style>

</style>
