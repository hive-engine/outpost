<template>
  <b-modal id="createDistributionModal" size="lg" centered title="Create Distribution">
    <template v-if="loading">
      <loading small />
    </template>

    <template v-else>
      <b-form-row>
        <b-col>
          <b-form-group label="Token Pair" invalid-feedback="Please select a liquidity pool." :state="$v.tokenPair.$dirty ? !$v.tokenPair.$error : null" description="DieselPool liquidity pair for recipient determination.">
            <model-select
              v-model="tokenPair"
              :options="poolOptions"
              placeholder="Select a Pool"
            />
          </b-form-group>
        </b-col>

        <b-col>
          <b-form-group label="Number of Payments" :description="`Number of times to distribute deposited tokens. Must be between 1 and 5555. Payments are distributed every ${ distTickHours } hours.`">
            <b-form-input
              v-model="numTicks"
              number
              type="number"
              :state="$v.numTicks.$dirty ? !$v.numTicks.$error : null"
              min="1"
              max="5555"
            />
          </b-form-group>
        </b-col>
        </b-col>
      </b-form-row>

      <b-form-group label="Excluded Accounts" description="Optional. List of account names to be excluded from pool share calculation.">
        <b-form-tags
          v-model="excludeAccount"
          separator=" ,;"
          placeholder="Username"
          :tag-validator="nameValidator"
          duplicate-tag-text="Duplicate username(s)"
          invalid-tag-text="Invalid username(s)"
          tag-remove-label="Remove"
          :state="$v.excludeAccount.$dirty ? !$v.excludeAccount.$error : null"
        />
      </b-form-group>

      <b-form-group label="Bonus Curve Settings" description="Bonus Curve is optional. You may leave both fields empty.">
        <b-form-row>
          <b-col>
            <b-form-group label="Number of Periods" description="Number of periods over which to apply the bonus curve. Must be between 1 and 5555.">
              <b-form-input
                v-model="bonusCurve.numPeriods"
                number
                type="number"
                :state="$v.bonusCurve.numPeriods.$dirty ? !$v.bonusCurve.numPeriods.$error : null"
                min="1"
                max="5555"
              />
            </b-form-group>
          </b-col>

          <b-col>
            <b-form-group label="Bonus Percentage" description="Percentage bonus per period LP is held. Must be between 1 and 100.">
              <b-form-input
                v-model="bonusCurve.periodBonusPct"
                number
                type="number"
                :state="$v.bonusCurve.periodBonusPct.$dirty ? !$v.bonusCurve.periodBonusPct.$error : null"
                min="1"
                max="100"
              />
            </b-form-group>
          </b-col>
        </b-form-row>
      </b-form-group>

      <div class="text-info">
        <p>Updating distribution costs: {{ distCreationFee }} BEE</p>
        <p>Your current balance: {{ tokenBalance }} BEE</p>
      </div>
    </template>

    <template #modal-footer>
      <b-button :disabled="loading || modalBusy || distCreationFee > tokenBalance" variant="primary" @click.prevent="createDistribution">
        <b-spinner v-if="modalBusy" small /> Create
      </b-button>
    </template>
  </b-modal>
</template>

<script>
import { mapActions } from 'vuex'
import { required } from 'vuelidate/lib/validators'
import { ModelSelect } from 'vue-search-select'

export default {
  name: 'CreateDistributionModal',

  components: {
    ModelSelect
  },

  data () {
    return {
      strategy: 'pool',
      numTicks: 1,

      tokenPair: null,
      excludeAccount: [],
      bonusCurve: {
        numPeriods: '',
        periodBonusPct: ''
      },

      distCreationFee: 0,
      distTickHours: 0,

      pools: [],

      loading: true,
      modalBusy: false
    }
  },

  computed: {
    poolOptions () {
      return this.pools.map(p => ({ value: p.tokenPair, text: p.tokenPair }))
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
    ...mapActions(['requestBroadcastJson']),
    ...mapActions('dashboard', ['fetchMarketPools']),

    nameValidator (name) {
      return (
        name === name.toLowerCase() &&
        name.length >= 3 &&
        name.length <= 16 &&
        /^([a-z])[a-z0-9-.]*$/.test(name)
      )
    },

    createDistribution () {
      this.$v.$touch()

      if (!this.$v.$invalid) {
        this.modalBusy = true

        const { strategy, numTicks, tokenPair, excludeAccount, bonusCurve: { numPeriods, periodBonusPct } } = this

        const payload = {
          strategy,
          numTicks: numTicks.toString()
        }

        payload.tokenPair = tokenPair

        if (excludeAccount.length > 0) {
          payload.excludeAccount = excludeAccount
        }

        if (numPeriods && periodBonusPct) {
          payload.bonusCurve = {
            numPeriods: numPeriods.toString(),
            periodBonusPct: periodBonusPct.toString()
          }
        }

        const json = {
          contractName: 'distribution',
          contractAction: 'create',
          contractPayload: payload
        }

        const jsonData = {
          id: this.$config.SIDECHAIN_ID,
          keyType: 'Active',
          json,
          message: 'Create Distribution',
          eventName: 'distribution-creation-successful'
        }

        this.requestBroadcastJson(jsonData)
      }
    },

    async onModalShown (btnEvent, modalId) {
      if (modalId === 'createDistributionModal') {
        this.loading = true

        const [{ distCreationFee, distTickHours }, tokenBalance, pools] = await Promise.all([
          this.$sidechain.getContractParams('distribution'),
          this.$sidechain.getBalance(this.$auth.user.username, 'BEE'),
          this.fetchMarketPools()
        ])

        this.distCreationFee = distCreationFee
        this.distTickHours = distTickHours
        this.pools = pools

        this.tokenBalance = tokenBalance ? Number(tokenBalance.balance) : 0

        this.loading = false
      }
    },

    onModalHidden (btnEvent, modalId) {
      if (modalId === 'createDistributionModal') {
        this.$v.$reset()

        this.loading = true
        this.modalBusy = false

        this.numTicks = 1

        this.tokenPair = null
        this.excludeAccount = []
        this.bonusCurve = {
          numPeriods: '',
          periodBonusPct: ''
        }
      }
    },

    resetModalBusyState () {
      this.modalBusy = false
    }
  },

  validations: {
    strategy: {
      required
    },

    numTicks: {
      required
    },

    tokenPair: {
      required
    },

    excludeAccount: {

    },

    bonusCurve: {
      numPeriods: {

      },

      periodBonusPct: {

      }
    }
  }
}
</script>

<style>

</style>
