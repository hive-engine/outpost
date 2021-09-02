<template>
  <div class="dieselpool-add">
    <template v-if="loading">
      <loading />
    </template>

    <template v-else>
      <b-row align-h="center">
        <b-col xl="7" lg="8">
          <div class="swap-currency-input mt-5">
            <b-form-group
              label="Base Token"
              invalid-feedback="Required and must be different from the Quote Token."
              :state="$v.baseSymbol.$dirty ? !$v.baseSymbol.$error : null"
            >
              <model-select
                v-model="baseSymbol"
                :options="availableTokens"
                placeholder="Select a token"
              />
            </b-form-group>
          </div>

          <div class="swap-currency-input mt-3">
            <b-form-group
              label="Quote Token"
              invalid-feedback="Required and must be different from the Base Token."
              :state="$v.quoteSymbol.$dirty ? !$v.quoteSymbol.$error : null"
            >
              <model-select
                v-model="quoteSymbol"
                :options="availableTokens"
                placeholder="Select a token"
              />
            </b-form-group>
          </div>

          <div class="swap-currency-input mt-3">
            <p v-if="$auth.loggedIn">
              Your current balance: {{ tokenBalance }} BEE (<a href="https://tribaldex.com/trade/BEE" target="_blank">Buy BEE</a>)
            </p>
            <p class="mb-0">
              Pool creation costs: {{ poolCreationFee }} BEE
            </p>
          </div>

          <div v-if="error" class="text-center mt-3">
            <p v-for="(em, i) of errorMessages" :key="i" class="text-danger">
              {{ em }}
            </p>
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
            :disabled="tokenBalance < poolCreationFee || btnBusy"
            @click.prevent="createPool"
          >
            <b-spinner v-if="btnBusy" small class="mb-1" /> Create Pool
          </b-button>
        </b-col>
      </b-row>
    </template>
  </div>
  </b-col>
  </b-row>
</template>
  </div>
</template>

<script>
import { mapActions } from 'vuex'
import { ModelSelect } from 'vue-search-select'
import { required } from 'vuelidate/lib/validators'

export default {
  name: 'DieselPoolCreate',

  components: {
    ModelSelect
  },

  data () {
    return {
      tokenBalance: 0,
      poolCreationFee: 0,

      baseSymbol: '',
      quoteSymbol: '',

      tokens: [],

      btnBusy: false,

      error: false,
      errorMessages: []
    }
  },

  async fetch () {
    this.loading = true

    this.baseSymbol = this.$config.TOKEN

    const [params] = await Promise.all([
      this.$sidechain.getContractParams('marketpools'),
      this.fetchBalance()
    ])

    this.poolCreationFee = Number(params.poolCreationFee)

    const limit = 1000
    const tokens = []
    let newData = 0
    let offset = 0

    do {
      const data = await await this.$sidechain.getTokens({}, offset, limit)
      newData = data.length

      if (data.length > 0) {
        tokens.push(...data)

        if (data.length < limit) {
          newData = 0
        }
      }
      offset += 1000
    } while (newData > 0)

    this.tokens = tokens

    this.loading = false
  },

  computed: {
    availableTokens () {
      return this.tokens.map(t => ({ value: t.symbol, text: `${t.name} (${t.symbol})` }))
    },

    tokenPair () {
      return `${this.baseSymbol}:${this.quoteSymbol}`
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

    tokenPair () {
      this.error = false
      this.errorMessages = []
    }
  },

  mounted () {
    this.$eventBus.$on('dieselpool-create-successful', this.requestValidateTransaction)

    this.$eventBus.$on('transaction-validated', this.onTransactionValidated)

    this.$eventBus.$on('transaction-broadcast-error', this.onBroadcastError)
  },

  beforeDestroy () {
    this.$eventBus.$off('dieselpool-create-successful', this.requestValidateTransaction)

    this.$eventBus.$off('transaction-validated', this.onTransactionValidated)

    this.$eventBus.$off('transaction-broadcast-error', this.onBroadcastError)
  },

  methods: {
    ...mapActions('pool', ['requestCreatePool']),
    ...mapActions('transaction', ['validateTransaction']),

    async fetchBalance () {
      if (!this.$auth.loggedIn) { return }

      try {
        const balance = await this.$sidechain.getBalance(this.$auth.user.username, 'BEE')
        this.tokenBalance = balance ? Number(balance.balance) : 0
      } catch (e) {
        console.log(e)
      }
    },

    async createPool () {
      this.error = false
      this.errorMessages = []

      this.$v.$touch()

      if (!this.$v.$invalid) {
        this.btnBusy = true

        const tokenPair = `${this.baseSymbol}:${this.quoteSymbol}`
        const inverseTokenPair = `${this.quoteSymbol}:${this.baseSymbol}`

        const [exists] = await this.$sidechain.getMarketPools({ tokenPair: { $in: [tokenPair, inverseTokenPair] } })

        if (!exists) {
          this.requestCreatePool(this.tokenPair)
        } else {
          this.btnBusy = false

          this.error = true
          this.errorMessages.push('This pool already exists.')
        }
      }
    },

    async requestValidateTransaction (data) {
      this.loading = true

      await this.validateTransaction(data.id)
    },

    async onTransactionValidated ({ contract, error, action }) {
      this.$v.$reset()

      this.baseSymbol = this.$config.TOKEN
      this.quoteSymbol = ''

      this.btnBusy = false

      await this.fetchBalance()

      this.loading = false

      if (!error && contract === 'marketpools' && action === 'createPool') {
        this.$notify({ title: 'Success', text: 'Pool has been created.', type: 'success' })
      }
    },

    onBroadcastError () {
      this.btnBusy = false
    }
  },

  validations: {
    baseSymbol: {
      required
    },

    quoteSymbol: {
      required,
      unique (v) {
        if (v === '') {
          return true
        }

        return v.toLowerCase() !== this.baseSymbol.toLowerCase()
      }
    }
  }
}
</script>

<style>

</style>
