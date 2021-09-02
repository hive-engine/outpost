<template>
  <div>
    <p>You can reward your liquidity providers in multiple ways - using the <em>Mining Contract</em> which will use a set amount of token inflation to reward liquidity providers directly, another way is to use the combination of the <em>TokenFunds (DAO) Contract</em> and the <em>Distribution Contract</em> where your token stakers can decide whether and how much to reward the liquidity providers. You may choose either of these two or use both at the same time.</p>

    <b-row class="mt-5 mb-3" align-v="center">
      <b-col>
        <h5>
          Mining Contract based LP Rewards
        </h5>
      </b-col>

      <b-col class="text-right">
        <b-button size="sm" variant="info" @click.prevent="$bvModal.show('createLPMiningPoolModal')">
          Create
        </b-button>
      </b-col>
    </b-row>

    <div v-if="pools.length > 0" class="table-responsive">
      <table class="table table-striped">
        <thead>
          <tr>
            <th>ID</th>
            <th>Mined Token</th>
            <th>Miners</th>
            <th>Config</th>
            <th>Active</th>
            <th />
          </tr>
        </thead>

        <tbody>
          <tr v-for="(pool, i) of pools" :key="i">
            <td>{{ pool.id }}</td>

            <td>{{ pool.minedToken }}</td>

            <td>
              <div v-if="pool.externalMiners">
                <span class="text-muted">Pool:</span> {{ pool.externalMiners }}
              </div>
            </td>

            <td>
              <span class="text-muted">Interval:</span> {{ pool.lotteryIntervalHours }} Hour(s)<br>
              <span class="text-muted">Winners:</span> {{ pool.lotteryWinners }}<br>
              <span class="text-muted">Amount:</span> {{ pool.lotteryAmount }} {{ pool.minedToken }}
            </td>

            <td>{{ pool.active? 'Yes': 'No' }}</td>

            <td class="text-right">
              <b-button size="sm" :variant="`${pool.active ? 'danger' : 'success'}`" @click.prevent="requestActivate({type: 'mining', id: pool.id, active: !pool.active})">
                {{ pool.active? 'Deactivate': 'Activate' }}
              </b-button>

              <b-button size="sm" variant="primary" @click.prevent="requestEditLPMining(pool)">
                Edit
              </b-button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <b-card v-else class="text-center">
      No LP mining pools found!
    </b-card>

    <h5 class="mt-5">
      DAO and Distribution Contract based LP Rewards
    </h5>

    <p>This is a two steps process - first you need to create a Distribution for a specific liquidity pool, then you'll create a DAO (if not created already) and activate it, then create a funding proposal inside that DAO and vote it.</p>

    <b-row class="mt-5 mb-3" align-v="center">
      <b-col>
        <h6>
          Distributions
        </h6>
      </b-col>

      <b-col class="text-right">
        <b-button size="sm" variant="info" @click="$bvModal.show('createDistributionModal')">
          Create Distribution
        </b-button>
      </b-col>
    </b-row>

    <div v-if="computedDistributions.length > 0" class="table-responsive">
      <table class="table table-striped">
        <thead>
          <tr>
            <th>ID</th>
            <th>Pool</th>
            <th>Config</th>
            <th>Balances</th>
            <th>Active</th>
            <th />
          </tr>
        </thead>

        <tbody>
          <tr v-for="(distribution, i) of computedDistributions" :key="i">
            <td>{{ distribution._id }}</td>

            <td>{{ distribution.tokenPair }}</td>

            <td>
              <span class="text-muted">Creator:</span> @{{ distribution.creator }}<br>
              <span class="text-muted">Payouts:</span> {{ Number(distribution.numTicks) - distribution.numTicksLeft }} / {{ distribution.numTicks }}<br>
              <span class="text-muted">Last Paid At:</span> {{ distribution.lastTickTime }}<br>
              <span class="text-muted">Bonus:</span> {{ distribution.bonusCurve.numPeriods ? `${distribution.bonusCurve.periodBonusPct}% bonus will be applied until ${distribution.bonusCurve.numPeriods} payments` : 'None' }}
            </td>

            <td>
              <template v-if="distribution.tokenBalances.length > 0">
                <div v-for="(balance, k) of distribution.tokenBalances" :key="k">
                  {{ balance.quantity }} {{ balance.symbol }}
                </div>
              </template>

              <template v-else>
                No Balance
              </template>
            </td>

            <td>{{ distribution.active ? 'Yes': 'No' }}</td>

            <td class="text-right">
              <b-button size="sm" :variant="`${distribution.active ? 'danger' : 'success'}`" @click.prevent="requestActivate({type: 'distribution', id: distribution._id, active: !distribution.active})">
                {{ distribution.active ? 'Deactivate': 'Activate' }}
              </b-button>

              <b-button size="sm" variant="primary" @click.prevent="REQUEST_EDIT({type: 'distribution', payload: distribution})">
                Edit
              </b-button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <b-card v-else class="text-center">
      No distributions found!
    </b-card>

    <b-row class="mt-5 mb-3" align-v="center">
      <b-col>
        <h6>
          DAO
        </h6>
      </b-col>

      <b-col class="text-right">
        <b-button size="sm" variant="info" @click.prevent="$bvModal.show('createDaoModal')">
          Create DAO
        </b-button>
      </b-col>
    </b-row>

    <div v-if="funds.length > 0" class="table-responsive">
      <table class="table table-striped">
        <thead>
          <tr>
            <th>ID</th>
            <th>Pay Token / Vote Token</th>
            <th>Config</th>
            <th>Active</th>
            <th />
          </tr>
        </thead>

        <tbody>
          <tr v-for="(fund, i) of funds" :key="i">
            <td>{{ fund.id }}</td>

            <td>{{ fund.payToken }} / {{ fund.voteToken }}</td>

            <td>
              <span class="text-muted">Threshold:</span> {{ fund.voteThreshold }} {{ fund.voteToken }}<br>
              <span class="text-muted">Daily Max Amount:</span> {{ fund.maxAmountPerDay }} {{ fund.payToken }}<br>
              <template v-if="fund.proposalFee">
                <span class="text-muted">Proposal Fee:</span> {{ fund.proposalFee.amount }} {{ fund.proposalFee.symbol }}<br>
              </template>
              <span class="text-muted">Max Duration:</span> {{ fund.maxDays }} days
            </td>

            <td>{{ fund.active ? 'Yes': 'No' }}</td>

            <td class="text-right">
              <b-button size="sm" :variant="`${fund.active ? 'danger' : 'success'}`" @click.prevent="requestActivate({type: 'fund', id: fund.id, active: !fund.active})">
                {{ fund.active? 'Deactivate': 'Activate' }}
              </b-button>

              <b-button v-if="fund.active" size="sm" variant="primary" @click.prevent="REQUEST_EDIT({type: 'fund', payload: fund})">
                Edit
              </b-button>

              <b-button v-if="fund.active" size="sm" variant="info" @click.prevent="REQUEST_CREATE_PROPOSAL(fund)">
                Create Proposal
              </b-button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <b-card v-else class="text-center">
      No DAO found!
    </b-card>

    <b-row class="mt-5 mb-3" align-v="center">
      <b-col>
        <h6>
          Proposals
        </h6>
      </b-col>
    </b-row>

    <div v-if="computedProposals.length > 0" class="table-responsive">
      <table class="table table-striped">
        <thead>
          <tr>
            <th>DAO</th>
            <th>Details</th>
            <th>Fund</th>
            <th>Approval Weight</th>
            <th>Active</th>
            <th />
          </tr>
        </thead>

        <tbody>
          <tr v-for="(proposal, i) of computedProposals" :key="i">
            <td>{{ proposal.fundId }}</td>

            <td>
              {{ proposal.title }}<br>
              <span class="text-muted">Recipient:</span> Distribution Contract #{{ proposal.payout.contractPayload.distId }}</span><br>
              <span class="text-muted">Started:</span> {{ proposal.started ? 'Yes' : 'No' }}<br>
              <span class="text-muted">Paying:</span> {{ proposal.started && proposal.approvalWeight > Number(proposal.fund.voteThreshold) ? 'Yes' : 'No' }}<br>
              <span class="text-muted">Duration:</span> {{ proposal.startDateFormated }} - {{ proposal.endDateFormated }} ({{ proposal.duration }} days)
            </td>

            <td>
              {{ formatNumumber(proposal.fundRequested) }} {{ proposal.fund.payToken }}<br>
              <span class="text-muted">Daily {{ proposal.amountPerDay }} {{ proposal.fund.payToken }}</span>
            </td>

            <td>
              {{ proposal.approvalWeight }} {{ proposal.fund.voteToken }}<br>
              <span class="text-muted">Threshold:</span> {{ proposal.fund.voteThreshold }} {{ proposal.fund.voteToken }}<br>

              <b-button class="mt-3" variant="primary" size="sm" @click="requestApproveProposal({id: proposal._id, approve: !isVoted(proposal._id) })">
                {{ isVoted(proposal._id) ? 'Unvote': 'Vote' }}
              </b-button>
            </td>

            <td>{{ proposal.active ? 'Yes': 'No' }}</td>

            <td class="text-right">
              <b-button size="sm" :variant="`${proposal.active ? 'danger' : 'success'}`" @click.prevent="requestActivate({type: 'proposal', id: proposal._id, active: !proposal.active})">
                {{ proposal.active? 'Deactivate': 'Activate' }}
              </b-button>

              <b-button v-if="proposal.fund.active" size="sm" variant="primary" @click.prevent="REQUEST_EDIT({type: 'proposal', payload: proposal})">
                Edit
              </b-button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <b-card v-else class="text-center">
      No proposals found!
    </b-card>

    <b-modal id="createLPMiningPoolModal" centered size="lg" title="Create LP Mining Pool">
      <template v-if="loading">
        <div class="text-center d-flex justify-content-center align-items-center flex-column">
          <b-spinner class="align-middle" type="grow" />

          <div class="mt-3">
            Loading...
          </div>
        </div>
      </template>

      <template v-else>
        <b-form-row>
          <b-col cols="12" lg="6">
            <b-form-group label="Liquidity Pool" description="Liquidity pool to reward." invalid-feedback="Please select a liquidity pool." :state="$v.tokenPair.$dirty ? !$v.tokenPair.$error : null">
              <model-select
                v-model="tokenPair"
                :options="availablePools"
                placeholder="Select a pool"
              />
            </b-form-group>

            <b-form-group label="Mined Token" description="Token to mine.">
              <b-form-input v-model="minedToken" readonly :state="$v.minedToken.$dirty ? !$v.minedToken.$error : null" />
            </b-form-group>

            <b-form-group label="Lottery Amount" description="Amount of tokens to split among the lottery winners.">
              <b-form-input v-model="lotteryAmount" type="number" number :state="$v.lotteryAmount.$dirty ? !$v.lotteryAmount.$error : null" />
            </b-form-group>
          </b-col>

          <b-col cols="12" lg="6">
            <b-form-group label="Lottery Winners" description="Number of lottery winners per round. Must be between 1 and 20.">
              <b-form-input v-model="lotteryWinners" type="number" number :state="$v.lotteryWinners.$dirty ? !$v.lotteryWinners.$error : null" />
            </b-form-group>

            <b-form-group label="Lottery Interval" description="How often in hours to run a lottery. Must be between 1 and 720 hours.">
              <b-form-input v-model="lotteryIntervalHours" type="number" number :state="$v.lotteryIntervalHours.$dirty ? !$v.lotteryIntervalHours.$error : null" />
            </b-form-group>
          </b-col>
        </b-form-row>

        <div class="text-info mt-3">
          <p>LP Mining pool creation fee: {{ poolCreationFee }} BEE</p>
          <p>Your current balance: {{ tokenBalance }} BEE</p>
        </div>
      </template>

      <template #modal-footer>
        <b-button variant="primary" :disabled="loading || modalBusy || poolCreationFee > tokenBalance" @click.prevent="createLPMiningPool">
          <b-spinner v-if="modalBusy" small /> Create
        </b-button>
      </template>
    </b-modal>

    <b-modal id="updateLPMiningPoolModal" centered size="lg" title="Update LP Mining Pool">
      <template v-if="loading">
        <div class="text-center d-flex justify-content-center align-items-center flex-column">
          <b-spinner class="align-middle" type="grow" />

          <div class="mt-3">
            Loading...
          </div>
        </div>
      </template>

      <template v-else>
        <b-form-row>
          <b-col cols="12" lg="6">
            <b-form-group label="Liquidity Pool" description="Liquidity pool to reward.">
              <b-form-input readonly disabled :value="tokenPair" />
            </b-form-group>

            <b-form-group label="Mined Token" description="Token to mine.">
              <b-form-input :value="minedToken" disabled readonly />
            </b-form-group>

            <b-form-group label="Lottery Amount" description="Amount of tokens to split among the lottery winners.">
              <b-form-input v-model="lotteryAmount" type="number" number :state="$v.lotteryAmount.$dirty ? !$v.lotteryAmount.$error : null" />
            </b-form-group>
          </b-col>

          <b-col cols="12" lg="6">
            <b-form-group label="Lottery Winners" description="Number of lottery winners per round. Must be between 1 and 20.">
              <b-form-input v-model="lotteryWinners" type="number" number :state="$v.lotteryWinners.$dirty ? !$v.lotteryWinners.$error : null" />
            </b-form-group>

            <b-form-group label="Lottery Interval" description="How often in hours to run a lottery. Must be between 1 and 720 hours.">
              <b-form-input v-model="lotteryIntervalHours" type="number" number :state="$v.lotteryIntervalHours.$dirty ? !$v.lotteryIntervalHours.$error : null" />
            </b-form-group>
          </b-col>
        </b-form-row>

        <div class="text-info mt-3">
          <p>LP Mining pool update fee: {{ poolUpdateFee }} BEE</p>
          <p>Your current balance: {{ tokenBalance }} BEE</p>
        </div>
      </template>

      <template #modal-footer>
        <b-button variant="primary" :disabled="loading || modalBusy || poolUpdateFee > tokenBalance" @click.prevent="updateLPMiningPool">
          <b-spinner v-if="modalBusy" small /> Update
        </b-button>
      </template>
    </b-modal>

    <create-dao />
    <update-dao />

    <create-proposal :distributions="distributions" />
    <update-proposal />

    <create-distribution />
    <update-distribution />
  </div>
</template>

<script>
import { mapActions, mapMutations } from 'vuex'
import { between, decimal, numeric, required } from 'vuelidate/lib/validators'
import { differenceInDays, format } from 'date-fns'
import { ModelSelect } from 'vue-search-select'
import { formatNumumber, toFixedWithoutRounding } from '@/utils'
import CreateDao from '@/components/dashboard/modals/CreateDao.vue'
import UpdateDao from '@/components/dashboard/modals/UpdateDao.vue'
import CreateProposal from '@/components/dashboard/modals/CreateProposal.vue'
import UpdateProposal from '@/components/dashboard//modals/UpdateProposal.vue'
import CreateDistribution from '@/components/dashboard/modals/CreateDistribution.vue'
import UpdateDistribution from '@/components/dashboard/modals/UpdateDistribution.vue'

export default {
  name: 'LPRewards',

  components: {
    ModelSelect,
    CreateDao,
    UpdateDao,
    CreateProposal,
    UpdateProposal,
    CreateDistribution,
    UpdateDistribution
  },

  props: {
    pools: { type: Array, required: true },
    funds: { type: Array, required: true },
    proposals: { type: Array, required: true },
    distributions: { type: Array, required: true }
  },

  data () {
    return {
      tokenPair: '',
      lotteryWinners: '',
      lotteryIntervalHours: '',
      lotteryAmount: '',
      minedToken: '',

      marketPools: [],

      poolCreationFee: 0,
      poolUpdateFee: 0,
      tokenBalance: 0,

      approvedProposals: [],

      loading: true,
      modalBusy: false
    }
  },

  computed: {
    availablePools () {
      return this.marketPools.map(p => ({ text: p.tokenPair, value: p.tokenPair }))
    },

    mappedFunds () {
      return new Map(this.funds.map(f => [f.id, f]))
    },

    computedDistributions () {
      return this.distributions.map((d) => {
        let tokenBalances = d.tokenBalances || []

        tokenBalances = tokenBalances.map(t => ({ ...t, quantity: Number(t.quantity) }))
          .filter(t => t.quantity > 0)

        return {
          ...d,
          lastTickTime: format(new Date(d.lastTickTime), 'Pp'),
          tokenBalances
        }
      })
    },

    computedProposals () {
      const proposals = this.proposals.map((p) => {
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
          started: Date.now() > startDateMs,
          fund: this.mappedFunds.get(p.fundId) || {}
        }
      })

      return proposals
    }
  },

  mounted () {
    this.$root.$on('bv::modal::shown', this.onModalShown)
    this.$root.$on('bv::modal::hidden', this.onModalHidden)

    this.$root.$on('bv::collapse::state', this.onCollapse)

    this.$eventBus.$on('transaction-broadcast-error', this.resetModalBusyState)
  },

  beforeDestroy () {
    this.$root.$off('bv::modal::shown', this.onModalShown)
    this.$root.$off('bv::modal::hidden', this.onModalHidden)

    this.$root.$off('bv::collapse::state', this.onCollapse)

    this.$eventBus.$off('transaction-broadcast-error', this.resetModalBusyState)
  },

  methods: {
    ...mapActions(['requestBroadcastJson', 'showConfirmation']),
    ...mapActions('dao', ['requestApproveProposal']),
    ...mapActions('dashboard', ['requestActivate', 'fetchMarketPools']),
    ...mapMutations('dashboard', ['REQUEST_CREATE_PROPOSAL', 'REQUEST_EDIT']),

    format,
    formatNumumber,

    createLPMiningPool () {
      this.$v.$touch()

      if (!this.$v.$invalid) {
        this.modalBusy = true

        const { tokenPair, lotteryWinners, lotteryIntervalHours, lotteryAmount, minedToken } = this

        const json = {
          contractName: 'marketpools',
          contractAction: 'createRewardPool',
          contractPayload: {
            tokenPair,
            lotteryWinners,
            lotteryIntervalHours,
            lotteryAmount: lotteryAmount.toString(),
            minedToken
          }
        }

        const jsonData = {
          id: this.$config.SIDECHAIN_ID,
          keyType: 'Active',
          json,
          message: 'Create LP Mining Pool',
          eventName: 'lp-mining-pool-creation-successful'
        }

        this.requestBroadcastJson(jsonData)
      }
    },

    updateLPMiningPool () {
      this.$v.$touch()

      if (!this.$v.$invalid) {
        this.modalBusy = true

        const { tokenPair, lotteryWinners, lotteryIntervalHours, lotteryAmount, minedToken } = this

        const json = {
          contractName: 'marketpools',
          contractAction: 'updateRewardPool',
          contractPayload: {
            tokenPair,
            lotteryWinners,
            lotteryIntervalHours,
            lotteryAmount: lotteryAmount.toString(),
            minedToken
          }
        }

        const jsonData = {
          id: this.$config.SIDECHAIN_ID,
          keyType: 'Active',
          json,
          message: 'Update LP Mining Pool',
          eventName: 'lp-mining-pool-update-successful'
        }

        this.requestBroadcastJson(jsonData)
      }
    },

    requestEditLPMining (pool) {
      const { externalMiners, lotteryWinners, lotteryIntervalHours, lotteryAmount, minedToken } = pool

      this.tokenPair = externalMiners
      this.lotteryWinners = lotteryWinners
      this.lotteryIntervalHours = lotteryIntervalHours
      this.lotteryAmount = lotteryAmount
      this.minedToken = minedToken

      this.$bvModal.show('updateLPMiningPoolModal')
    },

    async onModalShown (btnEvent, modalId) {
      if (modalId === 'createLPMiningPoolModal') {
        this.loading = true
        this.minedToken = this.$config.TOKEN

        const [{ poolCreationFee }, tokenBalance, pools] = await Promise.all([
          this.$sidechain.getContractParams('mining'),
          this.$sidechain.getBalance(this.$auth.user.username, 'BEE'),
          this.fetchMarketPools()
        ])

        this.poolCreationFee = Number(poolCreationFee)
        this.tokenBalance = tokenBalance ? Number(tokenBalance.balance) : 0
        this.marketPools = pools

        this.loading = false
      } else if (modalId === 'updateLPMiningPoolModal') {
        this.loading = true
        this.minedToken = this.$config.TOKEN

        const [{ poolUpdateFee }, tokenBalance] = await Promise.all([
          this.$sidechain.getContractParams('mining'),
          this.$sidechain.getBalance(this.$auth.user.username, 'BEE')
        ])

        this.poolUpdateFee = Number(poolUpdateFee)
        this.tokenBalance = tokenBalance ? Number(tokenBalance.balance) : 0

        this.loading = false
      }
    },

    onModalHidden (btnEvent, modalId) {
      if (modalId === 'createLPMiningPoolModal' || modalId === 'updateLPMiningPoolModal') {
        this.$v.$reset()

        this.loading = true
        this.modalBusy = false

        this.tokenPair = ''
        this.lotteryWinners = ''
        this.lotteryIntervalHours = ''
        this.lotteryAmount = ''
        this.minedToken = ''
      }
    },

    async onCollapse (collapseId, isJustShown) {
      if (collapseId === 'dashboard-lp-rewards' && isJustShown) {
        const approvedProposals = await this.$sidechain.getDTFApprovals({ from: this.$auth.user.username })

        this.approvedProposals = approvedProposals.map(p => p.to)
      }
    },

    resetModalBusyState () {
      this.modalBusy = false
    },

    isVoted (id) {
      return this.approvedProposals.includes(id)
    }
  },

  validations: {
    tokenPair: {
      required
    },

    lotteryWinners: {
      required,
      numeric,
      between: between(1, 20)
    },

    lotteryIntervalHours: {
      required,
      numeric,
      between: between(1, 720)
    },

    lotteryAmount: {
      required,
      decimal,
      greaterThanZero (v) {
        if (v === '') {
          return true
        }

        return v > 0
      }
    },

    minedToken: {
      required
    }
  }
}
</script>

<style>

</style>
