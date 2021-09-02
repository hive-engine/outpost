<template>
  <b-modal id="updateDistributionModal" centered size="lg" :title="`Update Distribution #${distribution._id}`">
    <template v-if="loading">
      <loading small />
    </template>

    <template v-else>
      <b-form-row>
        <b-col>
          <b-form-group label="Token Pair" description="DieselPool liquidity pair for recipient determination.">
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

      <b-form-group label="Excluded Accounts" description="List of account names to be excluded from pool share calculation.">
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

      <b-form-group label="Bonus Curve Settings" description="To remove bonus curve leave both fields empty.">
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
        <p>Updating distribution costs: {{ distUpdateFee }} BEE</p>
        <p>Your current balance: {{ tokenBalance }} BEE</p>
      </div>
    </template>

    <template #modal-footer>
      <b-button variant="primary" :disabled="loading || modalBusy || distUpdateFee > tokenBalance" @click.prevent="requestUpdate">
        <b-spinner v-if="modalBusy" small />  Update
      </b-button>
    </template>
  </b-modal>
</template>

<script>
import { mapGetters, mapActions } from 'vuex'
import { required } from 'vuelidate/lib/validators'
import { ModelSelect } from 'vue-search-select'

export default {
  name: 'UpdateDistributionModal',

  components: {
    ModelSelect
  },

  data () {
    return {
      numTicks: 1,

      tokenPair: null,
      excludeAccount: [],
      bonusCurve: {
        numPeriods: '',
        periodBonusPct: ''
      },

      distUpdateFee: 0,
      distTickHours: 0,

      tokenBalance: 0,

      pools: [],

      loading: true,
      modalBusy: false
    }
  },

  computed: {
    ...mapGetters('dashboard', ['distribution']),

    poolOptions () {
      return this.pools.map(p => ({ text: p.tokenPair, value: p.tokenPair }))
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

    requestUpdate () {
      this.$v.$touch()

      if (!this.$v.$invalid) {
        this.modalBusy = true

        const { numTicks, tokenPair, excludeAccount, bonusCurve: { numPeriods, periodBonusPct } } = this

        const payload = {
          id: this.distribution._id
        }

        if (numTicks && numTicks !== this.distribution.numTicks) {
          payload.numTicks = numTicks.toString()
        }

        payload.tokenPair = tokenPair

        if (excludeAccount.length > 0) {
          payload.excludeAccount = excludeAccount
        }

        payload.bonusCurve = {}

        if (numPeriods && periodBonusPct) {
          payload.bonusCurve = {
            numPeriods: numPeriods.toString(),
            periodBonusPct: periodBonusPct.toString()
          }
        }

        const json = {
          contractName: 'distribution',
          contractAction: 'update',
          contractPayload: payload
        }

        const jsonData = {
          id: this.$config.SIDECHAIN_ID,
          keyType: 'Active',
          json,
          message: `Update Distribution (#${payload.id})`,
          eventName: 'distribution-update-successful'
        }

        this.requestBroadcastJson(jsonData)
      }
    },

    async onModalShown (btnEvent, modalId) {
      if (modalId === 'updateDistributionModal') {
        this.loading = true

        const [{ distUpdateFee, distTickHours }, tokenBalance, pools] = await Promise.all([
          this.$sidechain.getContractParams('distribution'),
          this.$sidechain.getBalance(this.$auth.user.username, 'BEE'),
          this.fetchMarketPools()
        ])

        this.distUpdateFee = distUpdateFee
        this.distTickHours = distTickHours
        this.pools = pools

        this.tokenBalance = tokenBalance ? Number(tokenBalance.balance) : 0

        const { numTicks, tokenPair, excludeAccount, bonusCurve } = JSON.parse(JSON.stringify(this.distribution))

        this.numTicks = numTicks

        this.tokenPair = tokenPair
        this.excludeAccount = excludeAccount

        this.bonusCurve = {
          numPeriods: '',
          periodBonusPct: ''
        }

        if (bonusCurve && bonusCurve.numPeriods) {
          this.bonusCurve = bonusCurve
        }

        this.loading = false
      }
    },

    onModalHidden (btnEvent, modalId) {
      if (modalId === 'updateDistributionModal') {
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
