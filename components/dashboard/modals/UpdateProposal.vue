<template>
  <b-modal id="updateProposalModal" centered size="lg" :title="`Update Proposal #${proposal._id}`">
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
            menu-class="w-100"
            calendar-width="100%"
            :date-format-options="{ year: 'numeric', month: 'numeric', day: 'numeric' }"
            disabled
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
        <b-form-group label="Amount Per Day" :description="`Amount of tokens you want to receive per day. You can only decrease it.`">
          <b-form-input v-model="amountPerDay" number type="number" :state="$v.amountPerDay.$dirty ? !$v.amountPerDay.$error : null" />
        </b-form-group>
      </b-col>
    </b-form-row>

    <template #modal-footer>
      <b-button variant="primary" :disabled="modalBusy" @click.prevent="updateProposal">
        <b-spinner v-if="modalBusy" small /> Update
      </b-button>
    </template>
  </b-modal>
</template>

<script>
import { mapGetters, mapActions } from 'vuex'
import { required, decimal, maxLength } from 'vuelidate/lib/validators'
import { addDays, format, differenceInDays } from 'date-fns'

export default {
  name: 'UpdateProposalModal',

  data () {
    return {
      title: '',
      startDate: '',
      endDate: '',
      amountPerDay: '',
      authorPermlink: '',

      modalBusy: false
    }
  },

  computed: {
    ...mapGetters('dashboard', ['proposal']),

    minEndDate () {
      return addDays(new Date(this.proposal.startDate).getTime(), 2)
    },

    maxEndDate () {
      return new Date(this.proposal.endDate)
    },

    proposalDuration () {
      if (this.startDate && this.endDate) {
        const startDateMs = new Date(this.startDate).getTime()
        const endDateMs = new Date(this.endDate).getTime()

        return differenceInDays(endDateMs, startDateMs)
      }

      return 0
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
    ...mapActions('dao', ['requestUpdateProposal']),

    updateProposal () {
      this.$v.$touch()

      if (!this.$v.$invalid) {
        this.modalBusy = true

        const payload = {
          id: this.proposal._id.toString(),
          title: this.title,
          endDate: `${this.endDate}T00:00:00.000Z`,
          amountPerDay: this.amountPerDay.toString(),
          authorPermlink: this.authorPermlink
        }

        this.requestUpdateProposal(payload)
      }
    },

    onModalShown (btnEvent, modalId) {
      if (modalId === 'updateProposalModal') {
        const { title, startDate, endDate, amountPerDay, authorPermlink } = JSON.parse(JSON.stringify(this.proposal))

        this.title = title
        this.startDate = format(new Date(startDate).getTime(), 'yyyy-MM-dd')
        this.endDate = format(new Date(endDate).getTime(), 'yyyy-MM-dd')
        this.amountPerDay = amountPerDay
        this.authorPermlink = authorPermlink
      }
    },

    onModalHidden (btnEvent, modalId) {
      if (modalId === 'updateProposalModal') {
        this.$v.$reset()

        this.title = ''
        this.startDate = ''
        this.endDate = ''
        this.amountPerDay = ''
        this.authorPermlink = ''

        this.modalBusy = false
      }
    },

    resetModalBusyState () {
      this.modalBusy = false
    }
  },

  validations: {
    title: {
      required
    },

    endDate: {
      required
    },

    amountPerDay: {
      required,
      decimal,
      greaterThanZero: (v) => {
        if (v === '') { return true }

        return v > 0
      },
      maxValue: (v, vm) => v <= Number(vm.proposal.amountPerDay)
    },

    authorPermlink: {
      required,
      maxLength: maxLength(255),
      validAuthorPermlink: (value) => {
        if (value === '') { return true }

        return /^@[a-z0-9-.]{3,16}\/[\w\d-]+$/.test(value)
      }
    }
  }
}
</script>

<style>

</style>
