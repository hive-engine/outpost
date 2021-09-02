<template>
  <b-modal id="updateDaoModal" centered size="lg" title="Update DAO">
    <template v-if="loading">
      <loading small />
    </template>

    <template v-else>
      <b-form-group label="Vote Threshold" description="Minimum amount of stake required for proposal consideration.">
        <b-form-input v-model="voteThreshold" number type="number" min="1" :state="$v.voteThreshold.$dirty ? !$v.voteThreshold.$error : null" />
      </b-form-group>

      <b-form-group label="Maximum Duration" description="Maximum duration of any proposal. Must be between 1 and 730 days.">
        <b-form-input v-model="maxDays" number type="number" min="1" :state="$v.maxDays.$dirty ? !$v.maxDays.$error : null" />
      </b-form-group>

      <b-form-group label="Maximum Amount Per Day" description="Maximum amount of payment tokens a proposal can request">
        <b-form-input v-model="maxAmountPerDay" number type="number" min="1" :state="$v.maxAmountPerDay.$dirty ? !$v.maxAmountPerDay.$error : null" />
      </b-form-group>

      <template v-if="feeRequired">
        <b-form-row>
          <b-col>
            <b-form-group label="Payment Method" description="Fee can be burned or sent to the fee payment token's issuer.">
              <b-form-select v-model="proposalFee.method" :options="feeMethodOptions" :state="$v.proposalFee.method.$dirty ? !$v.proposalFee.method.$error : null" />
            </b-form-group>
          </b-col>

          <b-col>
            <b-form-group label="Fee Payment Token" description="Token to be used for paying creation fee." :state="$v.proposalFee.symbol.$dirty ? !$v.proposalFee.symbol.$error : null" invalid-feedback="Please select a token.">
              <b-form-select v-model="proposalFee.symbol" :options="availableTokens">
                <template #first>
                  <b-form-select-option value="" disabled>
                    Select a Token
                  </b-form-select-option>
                </template>
              </b-form-select>
            </b-form-group>
          </b-col>

          <b-col>
            <b-form-group label="Amount" description="Amount of fee.">
              <b-form-input v-model="proposalFee.amount" number type="number" :state="$v.proposalFee.amount.$dirty ? !$v.proposalFee.amount.$error : null" />
            </b-form-group>
          </b-col>
        </b-form-row>
      </template>

      <div class="text-info">
        <p>Updating dao costs: {{ dtfUpdateFee }} BEE</p>
        <p>Your current balance: {{ tokenBalance }} BEE</p>
      </div>
    </template>

    <template #modal-footer>
      <b-button variant="primary" :disabled="loading || modalBusy || dtfUpdateFee > tokenBalance" @click.prevent="updateFund">
        <b-spinner v-if="modalBusy" small /> Update
      </b-button>
    </template>
  </b-modal>
</template>

<script>
import { mapGetters, mapActions } from 'vuex'
import { required, requiredIf, minValue, maxValue, decimal, numeric } from 'vuelidate/lib/validators'

export default {
  name: 'UpdateDaoModal',

  data () {
    return {
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

      tokenBalance: 0,
      dtfUpdateFee: 0,

      tokens: [],

      loading: true,
      modalBusy: false
    }
  },

  computed: {
    ...mapGetters('dashboard', ['fund']),

    availableTokens () {
      return this.tokens.map(t => ({ value: t.symbol, text: `${t.name} (${t.symbol})` }))
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

    this.$eventBus.$off('transaction-broadcast-error', this.resetModalBusyState)
  },

  methods: {
    ...mapActions('dao', ['fetchTokens', 'requestUpdateFund']),

    updateFund () {
      this.$v.$touch()

      if (!this.$v.$invalid) {
        this.modalBusy = true

        const payload = {
          fundId: this.fund.id,
          voteThreshold: this.voteThreshold.toString(),
          maxDays: this.maxDays.toString(),
          maxAmountPerDay: this.maxAmountPerDay.toString()
        }

        if (this.feeRequired) {
          const { method, symbol, amount } = this.proposalFee
          payload.proposalFee = { method, symbol, amount: amount.toString() }
        }

        this.requestUpdateFund(payload)
      }
    },

    async onModalShown (btnEvent, modalId) {
      if (modalId === 'updateDaoModal') {
        this.loading = true

        const { voteThreshold, maxDays, maxAmountPerDay, proposalFee } = JSON.parse(JSON.stringify(this.fund))

        this.voteThreshold = voteThreshold
        this.maxDays = maxDays
        this.maxAmountPerDay = maxAmountPerDay
        this.feeRequired = !!proposalFee

        if (this.feeRequired) {
          this.proposalFee = proposalFee
        }

        const [{ dtfUpdateFee }, tokenBalance, tokens] = await Promise.all([
          this.$sidechain.getContractParams('tokenfunds'),
          this.$sidechain.getBalance(this.$auth.user.username, 'BEE'),
          this.fetchTokens()
        ])

        this.dtfUpdateFee = Number(dtfUpdateFee)
        this.tokenBalance = tokenBalance ? Number(tokenBalance.balance) : 0
        this.tokens = tokens

        this.loading = false
      }
    },

    onModalHidden (btnEvent, modalId) {
      if (modalId === 'updateDaoModal') {
        this.$v.$reset()

        this.modalBusy = false
        this.loading = true
      }
    },

    resetModalBusyState () {
      this.modalBusy = false
    }
  },

  validations: {
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
      greaterThanZero: v => v > 0
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
