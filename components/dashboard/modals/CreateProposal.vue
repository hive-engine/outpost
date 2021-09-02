<template>
  <b-modal id="createProposalModal" centered size="lg" title="Create Proposal">
    <template v-if="loading">
      <loading small />
    </template>

    <template v-else>
      <b-form-group label="Title" description="Brief description of your proposal. Maximum of 80 characters.">
        <b-form-input v-model="title" trim :state="$v.title.$dirty ? !$v.title.$error : null" />
      </b-form-group>

      <b-form-group label="Permlink" description="Permlink to the hive post describing the proposal. E.g.: @username/i-would-do-awesome-things">
        <b-form-input v-model="authorPermlink" trim :state="$v.authorPermlink.$dirty ? !$v.authorPermlink.$error : null" />
      </b-form-group>

      <b-form-row>
        <b-col>
          <b-form-group label="Start Date" description="Proposal start date. Must be at least one day in to the future.">
            <b-form-datepicker
              v-model="startDate"
              :min="minDate"
              :state="$v.startDate.$dirty ? !$v.startDate.$error : null"
              menu-class="w-100"
              calendar-width="100%"
              :date-format-options="{ year: 'numeric', month: 'numeric', day: 'numeric' }"
            />
          </b-form-group>
        </b-col>

        <b-col>
          <b-form-group label="End Date" description="Proposal end date, must not exceed the max duration of the token fund.">
            <b-form-datepicker
              v-model="endDate"
              :min="minEndDate"
              :max="maxEndDate"
              :state="$v.endDate.$dirty ? !$v.endDate.$error : null"
              menu-class="w-100"
              calendar-width="100%"
              :date-format-options="{ year: 'numeric', month: 'numeric', day: 'numeric' }"
            />
          </b-form-group>
        </b-col>
      </b-form-row>

      <b-form-row>
        <b-col>
          <b-form-group label="Duration" description="Duration of the proposal.">
            <b-input-group append="Days">
              <b-form-input :value="proposalDuration" readonly />
            </b-input-group>
          </b-form-group>
        </b-col>

        <b-col>
          <b-form-group label="Amount Per Day" :description="`Amount of ${fund.payToken} you want to receive per day.`">
            <b-input-group :append="fund.payToken">
              <b-form-input v-model="amountPerDay" number :state="$v.amountPerDay.$dirty ? !$v.amountPerDay.$error : null" />
            </b-input-group>
          </b-form-group>
        </b-col>

        <b-col>
          <b-form-group label="Expected Payout" description="Total expected payout if the proposal is being funded the whole duration of the proposal.">
            <b-input-group :append="fund.payToken">
              <b-form-input :value="expectedPayout" readonly />
            </b-input-group>
          </b-form-group>
        </b-col>
      </b-form-row>

      <b-form-row>
        <b-col>
          <b-form-group label="Recipent Type">
            <b-form-select v-model="payout.type" readonly disabled :options="payoutOptions" />
          </b-form-group>
        </b-col>

        <b-col>
          <b-form-group label="Recipent Contract">
            <b-form-input v-model="payout.name" readonly disabled />
          </b-form-group>
        </b-col>

        <b-col>
          <b-form-group v-if="payout.type === 'contract'" label="Recipient Distribution" invalid-feedback="Please select a distribution to receive payments." :state="$v.distribution.$dirty ? !$v.distribution.$error : null">
            <model-select
              v-model="distribution"
              :options="distributionOptions"
              placeholder="Select a distribution"
            />
          </b-form-group>
        </b-col>
      </b-form-row>

      <div v-if="creationFee" class="text-info">
        <p>Proposal creation fee: {{ creationFee.amount }} {{ creationFee.symbol }}</p>
        <p>Your current balance: {{ tokenBalance }} {{ creationFee.symbol }}</p>
      </div>
    </template>

    <template #modal-footer>
      <b-button :disabled="loading || modalBusy || shouldBeDisabled" variant="primary" @click.prevent="createProposal">
        <b-spinner v-if="modalBusy" small /> Create
      </b-button>
    </template>
  </b-modal>
</template>

<script>
import { mapGetters, mapActions } from 'vuex'
import { required, requiredIf, decimal, minLength, maxLength } from 'vuelidate/lib/validators'
import { addDays, differenceInDays } from 'date-fns'
import { ModelSelect } from 'vue-search-select'
import { toFixedWithoutRounding } from '@/utils'

export default {
  name: 'CreateProposalModal',

  components: {
    ModelSelect
  },

  props: {
    distributions: { type: Array, required: true }
  },

  data () {
    return {
      title: '',
      startDate: '',
      endDate: '',
      amountPerDay: '',
      authorPermlink: '',
      payout: {
        type: 'contract',
        name: 'distribution',
        contractPayload: '{}'
      },
      payoutOptions: [{ text: 'User', value: 'user' }, { text: 'Contract', value: 'contract' }],

      distribution: null,

      tokenBalance: 0,

      loading: true,
      modalBusy: false
    }
  },

  computed: {
    ...mapGetters('dashboard', ['fund']),

    distributionOptions () {
      return this.distributions.map(d => ({ text: `${d.tokenPair} (#${d._id})`, value: `${d._id}` }))
    },

    minDate () {
      return addDays(Date.now(), 2)
    },

    minEndDate () {
      return addDays(new Date(this.startDate).getTime(), 2)
    },

    maxEndDate () {
      return addDays(new Date(this.startDate).getTime(), Number(this.fund.maxDays))
    },

    creationFee () {
      const { proposalFee } = this.fund

      return proposalFee ? { ...proposalFee, amount: Number(proposalFee.amount) } : null
    },

    shouldBeDisabled () {
      return this.creationFee ? this.creationFee.amount > this.tokenBalance : false
    },

    proposalDuration () {
      if (this.startDate && this.endDate) {
        const startDateMs = new Date(this.startDate).getTime()
        const endDateMs = new Date(this.endDate).getTime()

        return differenceInDays(endDateMs, startDateMs)
      }

      return 0
    },

    expectedPayout () {
      if (this.proposalDuration && this.amountPerDay) {
        return toFixedWithoutRounding(this.proposalDuration * this.amountPerDay)
      }

      return 0
    }
  },

  watch: {
    distribution (value) {
      if (value) {
        this.payout.contractPayload = JSON.stringify({ distId: value })
      } else {
        this.payout.contractPayload = '{}'
      }
    }
  },

  mounted () {
    this.$root.$on('bv::modal::shown', this.onModalShown)
    this.$root.$on('bv::modal::hidden', this.onModalHidden)
  },

  beforeDestroy () {
    this.$root.$off('bv::modal::shown', this.onModalShown)
    this.$root.$off('bv::modal::hidden', this.onModalHidden)
  },

  methods: {
    ...mapActions('dao', ['requestCreateProposal']),

    createProposal () {
      this.$v.$touch()

      if (!this.$v.$invalid) {
        this.modalBusy = true

        const payload = {
          fundId: this.fund.id,
          title: this.title,
          startDate: `${this.startDate}T00:00:00.000Z`,
          endDate: `${this.endDate}T00:00:00.000Z`,
          amountPerDay: this.amountPerDay.toString(),
          authorPermlink: this.authorPermlink,
          payout: {
            type: this.payout.type,
            name: this.payout.name,
            contractPayload: JSON.parse(this.payout.contractPayload)
          }
        }

        this.requestCreateProposal(payload)
      }
    },

    async onModalShown (btnEvent, modalId) {
      if (modalId === 'createProposalModal') {
        this.loading = true

        if (this.creationFee) {
          const tokenBalance = await this.$sidechain.getBalance(this.$auth.user.username, this.creationFee.symbol)

          this.tokenBalance = tokenBalance ? Number(tokenBalance.balance) : 0
        }

        this.loading = false
      }
    },

    onModalHidden (btnEvent, modalId) {
      if (modalId === 'createProposalModal') {
        this.$v.$reset()

        this.title = ''
        this.startDate = ''
        this.endDate = ''
        this.amountPerDay = ''
        this.authorPermlink = ''
        this.payout = {
          type: 'contract',
          name: 'distribution',
          contractPayload: '{}'
        }

        this.distribution = null

        this.loading = true
        this.modalBusy = false
      }
    }
  },

  validations: {
    title: {
      required,
      minLength: minLength(1),
      maxLength: maxLength(80)
    },

    startDate: {
      required,
      validValue: (value, vm) => {
        if (value === '' || vm.endDate === '') { return true }

        return new Date(value).getTime() < new Date(vm.endDate).getTime()
      }
    },

    endDate: {
      required,
      validValue: (value, vm) => {
        if (value === '' || vm.startDate === '') { return true }

        return new Date(value).getTime() > new Date(vm.startDate).getTime()
      }
    },

    amountPerDay: {
      required,
      decimal,
      greaterThanZero: (v) => {
        if (v === '') { return true }

        return v > 0
      },
      maxValue: (v, vm) => v <= Number(vm.fund.maxAmountPerDay)
    },

    authorPermlink: {
      required,
      maxLength: maxLength(255),
      validAuthorPermlink: (value) => {
        if (value === '') { return true }

        return /^@[a-z0-9-.]{3,16}\/[\w\d-]+$/.test(value)
      }
    },

    payout: {
      type: {
        required,
        valid: v => ['user', 'contract'].includes(v)
      },

      name: {
        required,
        validUsername: (value) => {
          if (value === '') { return true }

          return /^([a-z])[a-z0-9-.]*$/.test(value)
        }
      },

      contractPayload: {
        requiredIf,
        validJson: (value) => {
          if (value === '') { return true }

          let parsed = false
          try {
            parsed = !!JSON.parse(value)
          } catch {
            //
          }

          return parsed
        }
      }
    },

    distribution: {
      required
    }
  }
}
</script>

<style>

</style>
