<template>
  <div class="dtf">
    <div class="page-header">
      <b-container>
        <h2>Proposals</h2>

        <div v-if="!fund.active" class="text-warning mt-3">
          DAO is currenly inactive.
        </div>

        <div v-if="$auth.loggedIn" class="mt-3">
          <b-button v-if="fund.active" size="sm" variant="primary" @click.prevent="$bvModal.show('createProposalModal')">
            Create Proposal
          </b-button>

          <b-button v-if="$auth.user.username === fund.creator" size="sm" variant="primary" @click.prevent="$bvModal.show('updateFundModal')">
            Edit DAO
          </b-button>

          <b-button v-if="$auth.user.username === fund.creator" size="sm" :variant="`${fund.active ? 'danger' : 'success'}`" @click.prevent="requestFundActivation(!fund.active)">
            {{ fund.active ? 'Deactivate' : 'Activate' }}
          </b-button>
        </div>
      </b-container>
    </div>

    <b-container fluid="lg">
      <b-form-row>
        <b-col class="text-center mt-3">
          <b-card class="h-100">
            Vote / Payment Token
            <div class="font-weight-bold">
              {{ fund.voteToken }} / {{ fund.payToken }}
            </div>
          </b-card>
        </b-col>

        <b-col class="text-center mt-3">
          <b-card class="h-100">
            Max Duration
            <div class="font-weight-bold">
              {{ fund.maxDays }} days
            </div>
          </b-card>
        </b-col>

        <b-col class="text-center mt-3">
          <b-card class="h-100">
            Max Payment Per Day
            <div class="font-weight-bold">
              {{ fund.maxAmountPerDay }} {{ fund.payToken }}
            </div>
          </b-card>
        </b-col>

        <b-col class="text-center mt-3">
          <b-card class="h-100">
            Vote Threshold
            <div class="font-weight-bold">
              {{ fund.voteThreshold }} {{ fund.voteToken }}
            </div>
          </b-card>
        </b-col>

        <b-col v-if="$auth.loggedIn" class="text-center mt-3">
          <b-card class="h-100">
            Your Vote Weight
            <div class="font-weight-bold">
              {{ approval_weight }} {{ fund.voteToken }}
            </div>
          </b-card>
        </b-col>
      </b-form-row>

      <b-form-row>
        <b-col md="3" class="mt-4">
          <b-input-group>
            <b-form-input v-model="search" placeholder="Search..." />

            <template #append>
              <b-button title="Refresh" variant="primary" @click="$fetch">
                <fa-icon icon="sync" />
              </b-button>
            </template>
          </b-input-group>
        </b-col>

        <b-col md="6" class="mt-4 text-center">
          <b-form-radio-group
            id="btn-filters"
            v-model="filter"
            :options="filterOptions"
            name="btn-filters"
            button-variant="outline-primary"
            buttons
          />
        </b-col>

        <b-col md="3" class="mt-4 text-center text-md-right">
          <b-form-select v-model="sortBy" :options="sortOptions" />
        </b-col>
      </b-form-row>

      <template v-if="loading">
        <loading />
      </template>

      <template v-else>
        <template v-if="paginatedProposals.length > 0">
          <b-card v-for="(proposal, i) of paginatedProposals" :key="i" class="mt-3">
            <b-form-row>
              <b-col sm="9" md="10">
                <div class="h5">
                  <a :href="`${$config.APP_DOMAIN}/${proposal.authorPermlink}`" target="_blank">{{ proposal.title }} <span class="text-muted">#{{ proposal._id }}</span></a>

                  <b-badge v-if="!proposal.active" variant="warning">
                    Disabled
                  </b-badge>

                  <b-badge v-else-if="proposal.started" variant="outline-success">
                    Started
                  </b-badge>
                </div>

                <div class="d-inline-flex">
                  <div>{{ proposal.startDateFormated }} - {{ proposal.endDateFormated }} <span class="text-muted">({{ proposal.duration }} days)</span></div>

                  <div class="ml-3">
                    <span class="font-weight-bold">{{ formatNumumber(proposal.fundRequested) }} {{ fund.payToken }}</span> <span class="text-muted">(Daily {{ proposal.amountPerDay }} {{ fund.payToken }})</span>
                  </div>
                </div>
              </b-col>

              <b-col sm="3" md="2" class="text-center mt-3 mt-sm-0">
                <div class="h5 mb-3">
                  <span v-if="proposal.approvalWeight > 0" class="cursor-pointer" @click.prevent="selectedProposal = proposal; $bvModal.show('proposalApproversModal')">{{ formatNumumber(proposal.approvalWeight) }} {{ fund.voteToken }}</span>

                  <span v-else>{{ formatNumumber(proposal.approvalWeight) }} {{ fund.voteToken }}</span>
                </div>

                <b-button
                  v-if="!userApprovals.has(proposal._id)"
                  class="mt-1"
                  :disabled="!$auth.loggedIn"
                  size="sm"
                  variant="primary"
                  @click.prevent="requestApproveProposal({id: proposal._id, approve: true})"
                >
                  Vote
                </b-button>

                <b-button v-else class="mt-1" size="sm" variant="warning" @click.prevent="requestApproveProposal({id: proposal._id, approve: false})">
                  Unvote
                </b-button>

                <template v-if="$auth.loggedIn && proposal.creator === $auth.user.username">
                  <b-button class="mt-1" :disabled="!fund.active" size="sm" variant="info" @click.prevent="selectedProposal = proposal; $bvModal.show('updateProposalModal')">
                    Edit
                  </b-button>

                  <b-button v-if="proposal.active" class="mt-1" size="sm" variant="danger" @click.prevent="disableProposal(proposal._id)">
                    Disable
                  </b-button>
                </template>
              </b-col>

              <b-col cols="12">
                <div class="d-inline-flex align-items-center mt-2">
                  <b-avatar variant="dark" size="30px" :src="`https://images.hive.blog/u/${proposal.creator}/avatar`" />

                  <div class="ml-2">
                    by <nuxt-link :to="{ name:'user', params:{user: proposal.creator}}" target="_blank">
                      {{ proposal.creator }}
                    </nuxt-link>
                  </div>

                  <div v-if="proposal.creator !== proposal.payout.name" class="ml-2">
                    for <nuxt-link v-if="proposal.payout.type === 'user'" :to="{ name:'user', params:{user: proposal.payout.name}}" target="_blank">
                      {{ proposal.payout.name }}
                    </nuxt-link> <span v-else>{{ proposal.payout.name }} contract</span>
                  </div>
                </div>
              </b-col>
            </b-form-row>
          </b-card>

          <b-pagination
            v-if="computedProposals.length > perPage"
            v-model="currentPage"
            class="mt-5"
            align="center"
            :total-rows="computedProposals.length"
            :per-page="perPage"
          />
        </template>

        <b-card v-else class="mt-3">
          No proposal has been found!
        </b-card>
      </template>
    </b-container>

    <b-modal
      id="proposalApproversModal"
      centered
      scrollable
      size="lg"
      hide-footer
      :title="`Accounts Approved Proposal #${selectedProposal._id}`"
    >
      <template v-if="approversLoading">
        <div class="text-center d-flex justify-content-center align-items-center flex-column">
          <b-spinner class="align-middle" type="grow" />
          <br>
          <p class="mt-3 mb-0">
            Loading...
          </p>
        </div>
      </template>

      <template v-else>
        <b-row>
          <b-col v-for="(approver, i) of approvers" :key="i" class="mb-4" md="6" lg="4">
            <b-media>
              <template #aside>
                <b-avatar variant="dark" :src="`https://images.hive.blog/u/${approver.account}/avatar`" rounded="circle" size="40px" />
              </template>

              <h6 class="mt-0 mb-1">
                {{ approver.account }}
              </h6>
              <p class="mb-0 text-muted">
                {{ approver.approvalWeight.toLocaleString() }} {{ approver.symbol }}
              </p>
            </b-media>
          </b-col>
        </b-row>
      </template>
    </b-modal>

    <create-proposal />
    <update-fund />
    <update-proposal :proposal="selectedProposal" />
  </div>
</template>

<script>
import { mapGetters, mapActions } from 'vuex'
import { differenceInDays, format } from 'date-fns'
import { formatNumumber, toFixedWithoutRounding } from '@/utils'
import CreateProposal from '@/components/dao/modals/CreateProposal.vue'
import UpdateFund from '@/components/dao/modals/UpdateFund.vue'
import UpdateProposal from '@/components/dao/modals/UpdateProposal.vue'

export default {
  name: 'Proposals',

  components: {
    CreateProposal,
    UpdateFund,
    UpdateProposal
  },

  async asyncData ({ store, error }) {
    try {
      await store.dispatch('dao/fetchFund', { root: true })

      if (!store.state.dao.fund) {
        return error({ statusCode: 404, message: 'DTF fund has not been found!' })
      }
    } catch {
      return error({ statusCode: 404, message: 'DTF fund has not been found!' })
    }
  },

  data () {
    return {
      search: '',
      filter: 'all',

      sortOptions: [{ text: 'Vote Weight', value: 'weight' }, { text: 'Start Date', value: 'startDate' }, { text: 'End Date', value: 'endDate' }],
      sortBy: 'weight',

      currentPage: 1,
      perPage: 20,

      query: {},

      approvals: [],
      approvers: [],

      selectedProposal: {},

      approversLoading: false
    }
  },

  async fetch () {
    this.loading = true

    const requests = [this.fetchProposals(this.query)]

    if (this.$auth.loggedIn) {
      requests.push(this.fetchUserApprovals())
    }

    await Promise.all(requests)

    this.loading = false
  },

  head () {
    return {
      title: 'Proposals'
    }
  },

  computed: {
    ...mapGetters('dao', ['fund', 'proposals', 'approval_weight']),

    filterOptions () {
      const options = [{ text: 'All', value: 'all' }, { text: 'Funded', value: 'funded' }, { text: 'Upcoming', value: 'upcoming' }]

      if (this.$auth.loggedIn) {
        options.push({ text: 'Voted', value: 'voted' })
      }

      return options
    },

    computedProposals () {
      const self = this

      let proposals = this.proposals.map((p) => {
        const startDateMs = new Date(p.startDate).getTime()
        const endDateMs = new Date(p.endDate).getTime()

        const duration = differenceInDays(endDateMs, startDateMs)

        return {
          ...p,
          startDateFormated: format(startDateMs, 'PP'),
          endDateFormated: format(endDateMs, 'PP'),
          startDateMs,
          endDateMs,
          duration,
          fundRequested: toFixedWithoutRounding(duration * Number(p.amountPerDay), 8),
          approvalWeight: Number(p.approvalWeight.$numberDecimal),
          started: Date.now() > startDateMs
        }
      })

      if (this.filter !== 'all') {
        proposals = proposals.filter((f) => {
          return (self.filter === 'voted')
            ? self.userApprovals.has(f._id)
            : self.filter === 'funded'
              ? f.approvalWeight > self.fund.voteThreshold
              : self.filter === 'upcoming' ? f.startDateMs > Date.now() : true
        })
      }

      if (this.search !== '') {
        const text = this.search.toLowerCase()

        if (Number.isInteger(parseInt(text))) {
          proposals = proposals.filter(f => f._id === Number(text))
        } else {
          proposals = proposals.filter(f => f.title.toLowerCase().includes(text) || f.creator.toLowerCase().includes(text) || f.authorPermlink.toLowerCase().includes(text))
        }
      }

      proposals = proposals.sort((a, b) => {
        if (self.sortBy === 'startDate') {
          return a.startDateMs - b.startDateMs
        } else if (self.sortBy === 'endDate') {
          return a.endDateMs - b.endDateMs
        }

        return b.approvalWeight - a.approvalWeight
      })

      return proposals
    },

    paginatedProposals () {
      return this.computedProposals.slice((this.currentPage - 1) * this.perPage, this.currentPage * this.perPage)
    },

    userApprovals () {
      return new Map(this.approvals.map(a => [a.to, a]))
    }
  },

  watch: {
    '$auth.loggedIn': {
      async handler (loggedIn) {
        if (loggedIn) {
          await this.fetchUserApprovals()
        } else {
          this.approvals = []
        }
      }
    }
  },

  created () {
    this.query = {
      active: true,
      endDate: { $gt: new Date().toISOString() }
    }

    if (this.$route.params.id && !isNaN(Number(this.$route.params.id))) {
      this.search = this.$route.params.id
    }
  },

  mounted () {
    this.$root.$on('bv::modal::show', this.onModalShow)

    this.$eventBus.$on([
      'dao-proposal-creation-successful',
      'dao-proposal-update-successful',
      'dao-proposal-approve-successful',
      'dao-proposal-disable-successful',
      'dao-update-successful',
      'dao-activation-successful'
    ], this.requestValidateTransaction)

    this.$eventBus.$on('transaction-validated', this.$nuxt.refresh)
  },

  beforeDestroy () {
    this.$root.$off('bv::modal::show', this.onModalShow)

    this.$eventBus.$off([
      'dao-proposal-creation-successful',
      'dao-proposal-update-successful',
      'dao-proposal-approve-successful',
      'dao-proposal-disable-successful',
      'dao-update-successful',
      'dao-activation-successful'
    ], this.requestValidateTransaction)

    this.$eventBus.$off('transaction-validated', this.$nuxt.refresh)
  },

  methods: {
    ...mapActions(['showConfirmation']),
    ...mapActions('dao', [
      'fetchFund',
      'fetchProposals',
      'fetchApprovals',
      'fetchProposalApprovals',
      'fetchApprovalWeight',
      'requestFundActivation',
      'requestApproveProposal',
      'requestDisableProposal']),
    ...mapActions('transaction', ['validateTransaction']),

    formatNumumber,

    async fetchUserApprovals () {
      const [approvals] = await Promise.all([
        this.fetchApprovals({ from: this.$auth.user.username }),
        this.fetchApprovalWeight()
      ])

      this.approvals = approvals
    },

    async disableProposal (id) {
      try {
        await this.showConfirmation({
          title: 'Disable Proposal',
          message: `Are you sure you want to permanently disable the proposal #${id}?`,
          variant: 'danger'
        })

        this.requestDisableProposal(id)
      } catch (error) {
        console.log(error)
      }
    },

    async requestValidateTransaction (data) {
      this.loading = true

      await this.validateTransaction(data.id)
    },

    async onModalShow (btnEvent, modalId) {
      if (modalId === 'proposalApproversModal') {
        this.approversLoading = true

        this.approvers = await this.fetchProposalApprovals({ id: this.selectedProposal._id, fundId: this.fund.id })

        this.approversLoading = false
      }
    }
  }
}
</script>

<router>
  {
    name:'proposals',
    path: '/proposals/:id?'
  }
</router>

<style>

</style>
