<template>
  <b-modal id="createDaoModal" centered title="Create DAO" size="lg">
    <template v-if="loading">
      <loading small />
    </template>

    <template v-else>
      <b-form-row>
        <b-col cols="12" md="6">
          <b-form-group label="Payment Token" description="Token to be paid out to the ranked proposals. You have to be the issuer of the token.">
            <b-form-input v-model="payToken" readonly disabled />
          </b-form-group>

          <b-form-group label="Vote Token" description="Token to be used for determining stake-weighted rank. Selected token must have staking enabled." :state="$v.voteToken.$dirty ? !$v.voteToken.$error : null" invalid-feedback="Please select a token.">
            <model-select v-model="voteToken" :options="voteTokens" placeholder="Select a Token" />
          </b-form-group>
        </b-col>

        <b-col cols="12" md="6">
          <b-form-group label="Vote Threshold" description="Minimum amount of stake required for proposal consideration.">
            <b-form-input v-model.number="voteThreshold" type="number" min="1" :state="$v.voteThreshold.$dirty ? !$v.voteThreshold.$error : null" />
          </b-form-group>

          <b-form-group label="Maximum Duration" description="Maximum duration of any proposal. Must be between 1 and 730 days.">
            <b-form-input v-model.number="maxDays" type="number" min="1" :state="$v.maxDays.$dirty ? !$v.maxDays.$error : null" />
          </b-form-group>

          <b-form-group label="Maximum Amount Per Day" description="Maximum amount of payment tokens a proposal can request">
            <b-form-input v-model.number="maxAmountPerDay" type="number" min="1" :state="$v.maxAmountPerDay.$dirty ? !$v.maxAmountPerDay.$error : null" />
          </b-form-group>
        </b-col>

        <b-col cols="12">
          <b-form-group label="Do you want to require fee to create proposals?">
            <b-form-checkbox v-model="feeRequired" name="fee-required" switch>
              Yes
            </b-form-checkbox>
          </b-form-group>
        </b-col>

        <template v-if="feeRequired">
          <b-form-row>
            <b-col>
              <b-form-group label="Payment Method" description="Fee can be burned or sent to the fee payment token's issuer.">
                <b-form-select v-model="proposalFee.method" :options="feeMethodOptions" :state="$v.proposalFee.method.$dirty ? !$v.proposalFee.method.$error : null" />
              </b-form-group>
            </b-col>

            <b-col>
              <b-form-group label="Fee Payment Token" description="Token to be used for paying creation fee." :state="$v.proposalFee.symbol.$dirty ? !$v.proposalFee.symbol.$error : null" invalid-feedback="Please select a token.">
                <model-select v-model="proposalFee.symbol" :options="availableTokens" placeholder="Select a Token" />
              </b-form-group>
            </b-col>

            <b-col>
              <b-form-group label="Amount" description="Amount of fee.">
                <b-form-input v-model.number="proposalFee.amount" type="number" :state="$v.proposalFee.amount.$dirty ? !$v.proposalFee.amount.$error : null" />
              </b-form-group>
            </b-col>
          </b-form-row>
        </template>
      </b-form-row>

      <b-alert variant="warning" :show="fundExists">
        A token fund already exists for this pay and vote token pair - {{ fundId }}. If you have created it, please consider updating the fund.
      </b-alert>

      <div class="text-info mt-3">
        <p>DAO creation fee: {{ dtfCreationFee }} BEE</p>
        <p>Your current balance: {{ tokenBalance }} BEE</p>
      </div>
    </template>

    <template #modal-footer>
      <b-button variant="primary" :disabled="loading || modalBusy || dtfCreationFee > tokenBalance" @click.prevent="createDao">
        <b-spinner v-if="modalBusy" small /> Create
      </b-button>
    </template>
  </b-modal>
</template>

<script>
import { mapActions } from 'vuex'
import { required, requiredIf, minValue, maxValue, decimal, numeric } from 'vuelidate/lib/validators'
import { ModelSelect } from 'vue-search-select'

export default {
  name: 'CreateDaoModal',

  components: {
    ModelSelect
  },

  data () {
    return {
      payToken: null,
      voteToken: null,
      voteThreshold: '',
      maxDays: '',
      maxAmountPerDay: '',
      proposalFee: {
        method: 'burn',
        symbol: '',
        amount: ''
      },
      feeRequired: true,
      feeMethodOptions: [{ value: 'burn', text: 'Burn' }, { value: 'issuer', text: 'To Issuer' }],

      fundExists: false,
      tokenBalance: 0,
      dtfCreationFee: 0,
      dtfUpdateFee: 0,

      tokens: [],

      loading: true,
      modalBusy: false
    }
  },

  computed: {
    fundId () {
      return `${this.payToken}:${this.voteToken}`
    },

    availableTokens () {
      return this.tokens.map(t => ({ value: t.symbol, text: `${t.name} (${t.symbol})` }))
    },

    voteTokens () {
      return this.tokens.filter(t => t.stakingEnabled).map(t => ({ value: t.symbol, text: `${t.name} (${t.symbol})` }))
    }
  },

  watch: {
    feeRequired (v) {
      this.$v.$reset()

      this.proposalFee = {
        method: 'burn',
        symbol: '',
        amount: ''
      }
    },

    async voteToken () {
      await this.fetchFund()
    }
  },

  mounted () {
    this.$root.$on('bv::modal::shown', this.onModalShown)
    this.$root.$on('bv::modal::hidden', this.onModalHidden)

    this.$eventBus.$on('transaction-broadcast-error', this.resetModalBusyState)
  },

  beforeDestroy () {
    this.$root.$off('bv::modal::shown', this.onModalShown)
    this.$root.$off('bv::modal::hidden', this.onModalHidden)

    this.$eventBus.$on('transaction-broadcast-error', this.resetModalBusyState)
  },

  methods: {
    ...mapActions(['requestBroadcastJson']),
    ...mapActions('dao', ['fetchTokens']),

    createDao () {
      this.$v.$touch()

      if (!this.$v.$invalid) {
        this.modalBusy = true

        const contractPayload = {
          payToken: this.payToken,
          voteToken: this.voteToken,
          voteThreshold: this.voteThreshold.toString(),
          maxDays: this.maxDays.toString(),
          maxAmountPerDay: this.maxAmountPerDay.toString()
        }

        if (this.feeRequired) {
          const { method, symbol, amount } = this.proposalFee
          contractPayload.proposalFee = { method, symbol, amount: amount.toString() }
        }

        const json = {
          contractName: 'tokenfunds',
          contractAction: 'createPool',
          contractPayload
        }

        const jsonData = {
          id: this.$config.SIDECHAIN_ID,
          keyType: 'Active',
          json,
          message: 'Create DAO',
          eventName: 'dao-creation-successful'
        }

        this.requestBroadcastJson(jsonData)
      }
    },

    async fetchFund () {
      this.fundExists = false

      if (this.payToken && this.voteToken) {
        const fund = await this.$sidechain.getDTFFund(this.fundId)

        this.fundExists = !!fund
      }
    },

    async onModalShown (btnEvent, modalId) {
      if (modalId === 'createDaoModal') {
        this.loading = true

        this.payToken = this.$config.TOKEN

        const [{ dtfCreationFee }, tokenBalance, tokens] = await Promise.all([
          this.$sidechain.getContractParams('tokenfunds'),
          this.$sidechain.getBalance(this.$auth.user.username, 'BEE'),
          this.fetchTokens()
        ])

        this.dtfCreationFee = Number(dtfCreationFee)
        this.tokenBalance = tokenBalance ? Number(tokenBalance.balance) : 0
        this.tokens = tokens

        this.loading = false
      }
    },

    onModalHidden (btnEvent, modalId) {
      if (modalId === 'createDaoModal') {
        this.$v.$reset()

        this.payToken = null
        this.voteToken = null
        this.voteThreshold = ''
        this.maxDays = ''
        this.maxAmountPerDay = ''
        this.proposalFee = {
          method: 'burn',
          symbol: '',
          amount: ''
        }
        this.feeRequired = true

        this.fundExists = false

        this.loading = true
        this.modalBusy = false
      }
    },

    resetModalBusyState () {
      this.modalBusy = false
    }
  },

  validations: {
    payToken: {
      required
    },

    voteToken: {
      required
    },

    voteThreshold: {
      required,
      decimal,
      minValue: minValue(1)
    },

    maxDays: {
      required,
      numeric,
      minValue: minValue(1),
      maxValue: maxValue(730)
    },

    maxAmountPerDay: {
      greaterThanZero: (v) => {
        if (v === '') { return true }

        return v > 0
      }
    },

    proposalFee: {
      method: {
        requiredIf: requiredIf(function () {
          return this.feeRequired
        })
      },

      symbol: {
        requiredIf: requiredIf(function () {
          return this.feeRequired
        })
      },

      amount: {
        requiredIf: requiredIf(function () {
          return this.feeRequired
        }),
        decimal,
        greaterThanZero: (v) => {
          if (v === '') { return true }

          return v > 0
        }
      }
    }
  }
}
</script>

<style>

</style>
