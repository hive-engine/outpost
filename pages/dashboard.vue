<template>
  <div class="dashboard">
    <div class="page-header">
      <b-container>
        <h2>Token Dashboard <sup class="text-warning">Beta</sup></h2>
      </b-container>
    </div>

    <template v-if="loading">
      <loading />
    </template>

    <template v-else>
      <b-container fluid="lg">
        <b-form-row class="justify-content-center">
          <b-col class="text-center mt-3">
            <b-card class="h-100">
              <h6 class="text-uppercase text-info">
                Max Supply
              </h6>

              <div class="font-weight-bold">
                {{ maxSupply.toLocaleString() }} {{ $config.TOKEN }}
              </div>
            </b-card>
          </b-col>

          <b-col class="text-center mt-3">
            <b-card class="h-100">
              <h6 class="text-uppercase text-info">
                Current Supply
              </h6>

              <div class="font-weight-bold">
                {{ supply.toLocaleString() }} {{ $config.TOKEN }}
              </div>
            </b-card>
          </b-col>

          <b-col class="text-center mt-3">
            <b-card class="h-100">
              <h6 class="text-uppercase text-info">
                Daily Emissions
              </h6>

              <div class="font-weight-bold">
                {{ dailyEmissions.toLocaleString() }} {{ $config.TOKEN }}
              </div>
            </b-card>
          </b-col>

          <div class="w-100" />

          <b-col class="text-center mt-3">
            <b-card class="h-100">
              <h6 class="text-uppercase text-info">
                PoB Rewards
              </h6>

              <div class="font-weight-bold">
                {{ pobRewards.toLocaleString() }} {{ $config.TOKEN }}
              </div>

              <div class="text-muted mt-2">
                {{ calculatePercentage(pobRewards) }}%
              </div>
            </b-card>
          </b-col>

          <b-col class="text-center mt-3">
            <b-card class="h-100">
              <h6 class="text-uppercase text-info">
                PoS Rewards
              </h6>

              <div class="font-weight-bold">
                {{ stakingRewards.toLocaleString() }} {{ $config.TOKEN }}
              </div>

              <div class="text-muted mt-2">
                {{ calculatePercentage(stakingRewards) }}%
              </div>
            </b-card>
          </b-col>

          <b-col class="text-center mt-3">
            <b-card class="h-100">
              <h6 class="text-uppercase text-info">
                LP Rewards
              </h6>

              <div class="font-weight-bold">
                {{ poolRewards.toLocaleString() }} {{ $config.TOKEN }}
              </div>

              <div class="text-muted mt-2">
                {{ calculatePercentage(poolRewards) }}%
              </div>
            </b-card>
          </b-col>

          <b-col class="text-center mt-3">
            <b-card class="h-100">
              <h6 class="text-uppercase text-info">
                DAO Rewards
              </h6>

              <div class="font-weight-bold">
                {{ daoPayments.toLocaleString() }} {{ $config.TOKEN }}
              </div>

              <div class="text-muted mt-2">
                {{ calculatePercentage(daoPayments) }}%
              </div>
            </b-card>
          </b-col>
        </b-form-row>

        <p class="small mt-3">
          * Rewards shown here are estimated daily rewards.
        </p>

        <h4>Manage Inflations</h4><hr>

        <div class="accordion" role="tablist">
          <b-card no-body class="mb-3">
            <b-card-header header-tag="header" class="p-1" role="tab">
              <b-button v-b-toggle.dashboard-pob-rewards block variant="primary">
                Proof of Brain (PoB)
              </b-button>
            </b-card-header>

            <b-collapse id="dashboard-pob-rewards" visible accordion="my-accordion" role="tabpanel">
              <b-card-body>
                <pob-rewards :scot="isSCOT" :pools="smtRewardPools" />
              </b-card-body>
            </b-collapse>
          </b-card>

          <b-card no-body class="mb-3">
            <b-card-header header-tag="header" class="p-1" role="tab">
              <b-button v-b-toggle.dashboard-pos-rewards block variant="primary">
                Proof of Stake (PoS)
              </b-button>
            </b-card-header>

            <b-collapse id="dashboard-pos-rewards" accordion="my-accordion" role="tabpanel">
              <b-card-body>
                <pos-rewards :scot="stakingRewardUsingScot" :pools="stakingRewardPools" />
              </b-card-body>
            </b-collapse>
          </b-card>

          <b-card no-body class="mb-3">
            <b-card-header header-tag="header" class="p-1" role="tab">
              <b-button v-b-toggle.dashboard-dao-rewards block variant="primary">
                Decentralized Autonomous Organization (DAO) Rewards
              </b-button>
            </b-card-header>

            <b-collapse id="dashboard-dao-rewards" accordion="my-accordion" role="tabpanel">
              <b-card-body>
                <dao-rewards :funds="funds" />
              </b-card-body>
            </b-collapse>
          </b-card>

          <b-card no-body class="mb-3">
            <b-card-header header-tag="header" class="p-1" role="tab">
              <b-button v-b-toggle.dashboard-lp-rewards block variant="primary">
                Liquidity Providers (LP) Rewards
              </b-button>
            </b-card-header>

            <b-collapse id="dashboard-lp-rewards" accordion="my-accordion" role="tabpanel">
              <b-card-body>
                <lp-rewards :pools="lpRewardPools" :funds="funds" :proposals="distributionProposals" :distributions="distributions" />
              </b-card-body>
            </b-collapse>
          </b-card>
        </div>
      </b-container>
    </template>
  </div>
</template>

<script>
import { mapActions, mapGetters } from 'vuex'
import { toFixedWithoutRounding } from '@/utils'
import PobRewards from '@/components/dashboard/PobRewards.vue'
import PosRewards from '@/components/dashboard/PosRewards.vue'
import LpRewards from '@/components/dashboard/LpRewards.vue'
import DaoRewards from '@/components/dashboard/DaoRewards.vue'

export default {
  name: 'Dashboard',

  components: {
    PobRewards,
    PosRewards,
    LpRewards,
    DaoRewards
  },

  middleware: 'issuer',

  data () {
    return {
      scotRewardPerDay: 0,

      settings: {
        pob_inflation: true,
        staking_inflation: true,
        pool_inflation: true,
        dao_inflation: true
      },

      maxSupply: 0,
      supply: 0,
      pobRewards: 0,
      stakingRewards: 0,
      poolRewards: 0,
      daoPayments: 0,

      stakingRewardUsingScot: false,

      smtRewardPools: [],

      stakingRewardPools: [],
      lpRewardPools: [],
      funds: [],
      distributionProposals: [],
      distributions: []
    }
  },

  async fetch () {
    this.loading = true

    await this.fetchTokenInflations()

    this.loading = false
  },

  head () {
    return {
      title: 'Token Dashboard'
    }
  },

  computed: {
    ...mapGetters(['tribe_info', 'tribe_config']),

    isSCOT () {
      return Boolean(this.tribe_info.start_date)
    },

    dailyEmissions () {
      const emissions = this.pobRewards + this.stakingRewards + this.poolRewards + this.daoPayments

      return toFixedWithoutRounding(emissions, this.tribe_info.precision)
    }
  },

  mounted () {
    this.$eventBus.$on([
      'smt-reward-pool-update-successful',
      'smt-reward-pool-activation-successful',

      'mining-pool-creation-successful',
      'mining-pool-activation-successful',
      'mining-pool-update-successful',

      'lp-mining-pool-creation-successful',
      'lp-mining-pool-update-successful',

      'dao-update-successful',
      'dao-activation-successful',

      'dao-proposal-creation-successful',
      'dao-proposal-update-successful',
      'dao-proposal-activation-successful',
      'dao-proposal-approve-successful',

      'distribution-creation-successful',
      'distribution-update-successful',
      'distribution-activation-successful'
    ], this.requestValidateTransaction)

    this.$eventBus.$on('transaction-validated', this.$fetch)
  },

  beforeDestroy () {
    this.$eventBus.$off([
      'smt-reward-pool-update-successful',
      'smt-reward-pool-activation-successful',

      'mining-pool-creation-successful',
      'mining-pool-activation-successful',
      'mining-pool-update-successful',

      'lp-mining-pool-creation-successful',
      'lp-mining-pool-update-successful',

      'dao-update-successful',
      'dao-activation-successful',

      'dao-proposal-creation-successful',
      'dao-proposal-update-successful',
      'dao-proposal-activation-successful',
      'dao-proposal-approve-successful',

      'distribution-creation-successful',
      'distribution-update-successful',
      'distribution-activation-successful'
    ], this.requestValidateTransaction)

    this.$eventBus.$off('transaction-validated', this.$fetch)
  },

  methods: {
    ...mapActions('transaction', ['validateTransaction']),

    async requestValidateTransaction (data) {
      this.loading = true

      this.$bvModal.hide('manageSMTModal')

      this.$bvModal.hide('createMiningPoolModal')
      this.$bvModal.hide('manageMiningPoolModal')

      this.$bvModal.hide('createLPMiningPoolModal')
      this.$bvModal.hide('updateLPMiningPoolModal')

      this.$bvModal.hide('createDaoModal')
      this.$bvModal.hide('updateDaoModal')

      this.$bvModal.hide('createProposalModal')
      this.$bvModal.hide('updateProposalModal')

      this.$bvModal.hide('createDistributionModal')
      this.$bvModal.hide('updateDistributionModal')

      await this.validateTransaction(data.id)
    },

    async fetchTokenInflations () {
      const [[token]] = await Promise.all([
        this.$sidechain.getTokens({ symbol: this.$config.TOKEN }),
        this.calculatePOBRewards(),
        this.calculateMiningRewards(),
        this.calculateDAORewards(),
        this.fetchDistributions()
      ])

      if (token) {
        const { maxSupply, supply } = token

        this.maxSupply = Number(maxSupply)
        this.supply = Number(supply)
      }
    },

    async calculatePOBRewards () {
      try {
        let rewardPerDay = 0
        this.smtRewardPools = []

        if (this.isSCOT) {
          const blocksInADay = 28800

          this.scotRewardPerDay = (this.tribe_info.rewards_token / 10 ** this.tribe_info.precision) * (blocksInADay / this.tribe_config.rewards_token_every_n_block)

          rewardPerDay = (this.scotRewardPerDay * this.tribe_config.pob_pool_percentage / 100)
        } else {
          const rewardPool = await this.$sidechain.getSMTRewardPool(this.$config.TOKEN)

          if (rewardPool) {
            this.smtRewardPools.push(rewardPool)

            const { rewardIntervalSeconds, rewardPerInterval } = rewardPool.config

            rewardPerDay = ((24 * 60 * 60) / rewardIntervalSeconds) * Number(rewardPerInterval)
          }
        }

        this.pobRewards = toFixedWithoutRounding(rewardPerDay, this.tribe_info.precision)
      } catch (e) {
        console.log(e.message)
      }
    },

    async calculateMiningRewards () {
      try {
        if (this.tribe_info.mining_enabled || this.tribe_info.staking_enabled) {
          let stakingRewards = 0

          if (this.tribe_config.posm_pool_percentage > 0) {
            stakingRewards = (this.scotRewardPerDay * this.tribe_config.posm_pool_percentage / 100)
          }

          if (this.tribe_config.staking_pool_percentage > 0) {
            stakingRewards += (this.scotRewardPerDay * this.tribe_config.staking_pool_percentage / 100)
          }

          this.stakingRewards = toFixedWithoutRounding(stakingRewards, this.tribe_info.precision)

          this.stakingRewardUsingScot = true
        } else {
          const rewardPools = await this.$sidechain.getMiningPools({ minedToken: this.$config.TOKEN })

          let stakingRewards = rewardPools.filter(m => !m.externalContract)

          this.stakingRewardPools = stakingRewards

          stakingRewards = stakingRewards.filter(p => p.active).reduce(
            (acc, cur) => acc + (Number(cur.lotteryAmount) * (24 / cur.lotteryIntervalHours)), 0
          )

          let poolRewards = rewardPools.filter(m => m.externalContract && m.externalContract === 'marketpools')

          this.lpRewardPools = poolRewards

          poolRewards = poolRewards.filter(p => p.active).reduce(
            (acc, cur) => acc + (Number(cur.lotteryAmount) * (24 / cur.lotteryIntervalHours)), 0
          )

          this.stakingRewards = stakingRewards
          this.poolRewards = poolRewards
        }
      } catch (e) {
        console.log(e.message)
      }
    },

    async calculateDAORewards () {
      try {
        const funds = await this.$sidechain.getDTFFunds({ payToken: this.$config.TOKEN })

        this.funds = funds

        const fundsMapped = new Map(funds.map(f => [f.id, Number(f.voteThreshold)]))

        const fundIds = Array.from(fundsMapped.keys())

        let proposals = await this.$sidechain.getDTFProposals({
          fundId: { $in: fundIds },
          endDate: { $gte: new Date().toISOString() },
          active: true
        })

        this.distributionProposals = proposals.filter(p => p.payout && p.payout.type === 'contract' && p.payout.name === 'distribution')

        proposals = proposals.filter((p) => {
          const voteThreshold = fundsMapped.get(p.fundId)

          return Number(p.approvalWeight.$numberDecimal) > voteThreshold
        })

        this.daoPayments = toFixedWithoutRounding(proposals.reduce((acc, cur) => acc + Number(cur.amountPerDay), 0), this.tribe_info.precision)
      } catch (e) {
        console.log(e.message)
      }
    },

    async fetchDistributions () {
      try {
        const distributions = await this.$sidechain.getDistributions({
          strategy: 'pool',
          tokenPair: { $regex: `^${this.$config.TOKEN}:?|:${this.$config.TOKEN}$`, $options: 'x' }
        })

        this.distributions = distributions
      } catch (e) {
        console.log(e.message)
      }
    },

    calculatePercentage (value) {
      return ((value / this.dailyEmissions) * 100).toFixed(2)
    }
  }
}
</script>

<style>

</style>
