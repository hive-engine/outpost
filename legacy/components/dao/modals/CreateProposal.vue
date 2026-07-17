<template>
  <b-modal id="createProposalModal" centered size="lg" title="Create Proposal">
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
        <b-form-group label="Payout Type" description="Select a payout recipient type">
          <b-form-select v-model="payout.type" :options="payoutOptions" :state="$v.payout.type.$dirty ? !$v.payout.type.$error : null" />
        </b-form-group>
      </b-col>

      <b-col>
        <b-form-group label="Recipent Name" :description="`Recipent ${payout.type} name`">
          <b-form-input v-model="payout.name" trim :state="$v.payout.name.$dirty ? !$v.payout.name.$error : null" />
        </b-form-group>
      </b-col>

      <b-col>
        <b-form-group v-if="payout.type === 'contract'" label="Contract Payload" description="Custom object that is passed to the target contract's receiveDtfTokens action">
          <b-form-input v-model="payout.contractPayload" trim :state="$v.payout.contractPayload.$dirty ? !$v.payout.contractPayload.$error : null" />
        </b-form-group>
      </b-col>
    </b-form-row>

    <div v-if="creationFee" class="text-info mt-5">
      <p>Proposal creation fee: {{ creationFee.amount }} {{ creationFee.symbol }}</p>
      <p>Your current balance: {{ tokenBalance }} {{ creationFee.symbol }}</p>
    </div>

    <template #modal-footer>
      <b-button :disabled="shouldBeDisabled" variant="primary" @click.prevent="createProposal">
        Create
      </b-button>
    </template>
  </b-modal>
</template>

<script>
import { mapGetters, mapActions } from 'vuex'
import { required, requiredIf, decimal, minLength, maxLength } from 'vuelidate/lib/validators'
import { addDays, differenceInDays } from 'date-fns'
import { toFixedWithoutRounding } from '@/utils'

export default {
  name: 'CreateProposalModal',

  data () {
    return {
      title: '',
      startDate: '',
      endDate: '',
      amountPerDay: '',
      authorPermlink: '',
      payout: {
        type: 'user',
        name: '',
        contractPayload: '{}'
      },
      payoutOptions: [{ text: 'User', value: 'user' }, { text: 'Contract', value: 'contract' }],

      tokenBalance: 0
    }
  },

  computed: {
    ...mapGetters('dao', ['fund']),

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

  mounted () {
    this.$root.$on('bv::modal::show', this.onModalShow)

    this.$eventBus.$on('dao-proposal-creation-successful', this.onProposalCreation)
  },

  beforeDestroy () {
    this.$root.$off('bv::modal::show', this.onModalShow)
    this.$eventBus.$off('dao-proposal-creation-successful', this.onProposalCreation)
  },

  methods: {
    ...mapActions('dao', ['requestCreateProposal']),

    createProposal () {
      this.$v.$touch()

      if (!this.$v.$invalid) {
        const payload = {
          fundId: this.fund.id,
          title: this.title,
          startDate: `${this.startDate}T00:00:00.000Z`,
          endDate: `${this.endDate}T00:00:00.000Z`,
          amountPerDay: this.amountPerDay.toString(),
          authorPermlink: this.authorPermlink,
          payout: {
            type: this.payout.type,
            name: this.payout.name
          }
        }

        if (this.payout.type === 'contract') {
          payload.payout.contractPayload = JSON.parse(this.payout.contractPayload)
        }

        this.requestCreateProposal(payload)
      }
    },

    resetForm () {
      this.$v.$reset()

      this.title = ''
      this.startDate = ''
      this.endDate = ''
      this.amountPerDay = ''
      this.authorPermlink = ''
      this.payout = {
        type: 'user',
        name: this.$auth.user.username,
        contractPayload: '{}'
      }
    },

    async onModalShow (btnEvent, modalId) {
      if (modalId === 'createProposalModal') {
        this.resetForm()

        if (this.creationFee) {
          const tokenBalance = await this.$sidechain.getBalance(this.$auth.user.username, this.creationFee.symbol)

          this.tokenBalance = tokenBalance ? Number(tokenBalance.balance) : 0
        }
      }
    },

    onProposalCreation (data) {
      this.$bvModal.hide('createProposalModal')

      this.resetForm()
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
        requiredIf: requiredIf(vm => vm.type === 'contract'),
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
    }
  }
}
</script>

<style>

</style>
