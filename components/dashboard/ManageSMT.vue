<template>
  <b-modal
    id="manageSMTModal"
    v-model="ui.modals.manageSMTModal"
    title="Update Reward Pool Config"
    size="xl"
    centered
    no-footer
    @hidden="onHidden"
  >
    <loading v-if="loading" small />

    <template v-else>
      <b-row class="justify-content-center">
        <b-col cols="12" lg="6">
          <b-form-group label="Post Reward Curve" description="Post reward curve. Options are: power (r^a).">
            <b-form-select v-model="config.postRewardCurve" :options="curveOptions" />
          </b-form-group>

          <b-form-group label="Post Reward Curve Parameter" description="For 'power' curve, this is the exponent 'a' of r^a. Use 1 for linear. Max 2 decimals.">
            <b-form-input v-model="config.postRewardCurveParameter" number :state="okDecimal(config.postRewardCurveParameter)" />
          </b-form-group>

          <b-form-group label="Curation Reward Curve" description="Curation reward curve. Options are: power (r^a).">
            <b-form-select v-model="config.curationRewardCurve" :options="curveOptions" />
          </b-form-group>

          <b-form-group label="Curation Reward Curve Parameter" description="For 'power' curve, this is the exponent 'a' of r^a. Use 1 for linear. Max 2 decimals.">
            <b-form-input v-model="config.curationRewardCurveParameter" number :state="okDecimal(config.curationRewardCurveParameter)" />
          </b-form-group>

          <b-form-group label="Curation Reward Percentage" description="Percentage of post reward allocated to curators (0–100).">
            <b-form-input v-model.number="config.curationRewardPercentage" number type="number" step="1" min="0" max="100" :state="okRange(config.curationRewardPercentage, 0, 100)" />
          </b-form-group>

          <b-form-group label="Cashout Window Days" description="How long, in days, until a post pays out (1–30).">
            <b-form-input v-model.number="config.cashoutWindowDays" number type="number" step="1" min="1" max="30" :state="okRange(config.cashoutWindowDays, 1, 30)" />
          </b-form-group>

          <b-form-group label="Staked Reward Percentage" description="Percentage of rewards given as staked (0–100).">
            <b-form-input v-model.number="config.stakedRewardPercentage" number type="number" step="1" min="0" max="100" :state="okRange(config.stakedRewardPercentage, 0, 100)" />
          </b-form-group>

          <b-form-group label="Tags" :description="`Tags (including community) used to index a post for this reward pool. Max ${maxTagsPerPool}.`">
            <b-form-tags v-model="config.tags" tag-variant="primary" input-id="smt-tags" separator=" ,;" placeholder="Add tags" :tag-validator="tagValidator" :limit="maxTagsPerPool" :state="Array.isArray(config.tags) && config.tags.length > 0" />
          </b-form-group>

          <b-form-group label="Excluded Tags" :description="`Tags ignored when indexing a post. Max ${maxTagsPerPool}.`">
            <b-form-tags v-model="config.excludeTags" tag-variant="danger" input-id="smt-exclude-tags" separator=" ,;" placeholder="Add excluded tags" :tag-validator="tagValidator" :limit="maxTagsPerPool" />
          </b-form-group>
        </b-col>

        <b-col cols="12" lg="6">
          <b-form-group label="Reward Interval Seconds" description="How often tokens are added to the reward pool (30–86400, divisible by 3).">
            <b-form-input v-model.number="config.rewardIntervalSeconds" number :state="okInterval(config.rewardIntervalSeconds)" />
          </b-form-group>

          <b-form-group label="Reward Per Interval" description="How much to add to the reward pool every interval.">
            <b-form-input v-model="config.rewardPerInterval" number :state="okDecimalAny(config.rewardPerInterval)" />
          </b-form-group>

          <b-form-group label="Vote Regeneration Days" description="Days to fully regenerate voting power from 0 to 100%.">
            <b-form-input v-model.number="config.voteRegenerationDays" number type="number" step="1" min="1" :state="okMin(config.voteRegenerationDays, 1)" />
          </b-form-group>

          <b-form-group label="Vote Power Consumption" description="Vote power consumed at full power for a 100% vote.">
            <b-form-input v-model.number="config.votePowerConsumption" number type="number" step="1" min="1" :state="okMin(config.votePowerConsumption, 1)" />
          </b-form-group>

          <b-form-group label="Downvote Power Regeneration Days" description="Days to fully regenerate downvoting power from 0 to 100%.">
            <b-form-input v-model.number="config.downvoteRegenerationDays" number type="number" step="1" min="1" :state="okMin(config.downvoteRegenerationDays, 1)" />
          </b-form-group>

          <b-form-group label="Downvote Power Consumption" description="Downvote power consumed at full power for a 100% downvote.">
            <b-form-input v-model.number="config.downvotePowerConsumption" number type="number" step="1" min="1" :state="okMin(config.downvotePowerConsumption, 1)" />
          </b-form-group>

          <b-form-group label="Setup App Tax" description="Configure an app tax for posts not using a designated app.">
            <b-form-checkbox v-model="useAppTaxConfig" switch>{{ useAppTaxConfig ? 'Yes' : 'No' }}</b-form-checkbox>
          </b-form-group>

          <b-row v-if="useAppTaxConfig">
            <b-col cols="5">
              <b-form-group label="App name" description="Matches json_metadata.app.">
                <b-form-input v-model="config.appTaxConfig.app" placeholder="bbhproject" />
              </b-form-group>
            </b-col>
            <b-col cols="3">
              <b-form-group label="Percentage" description="Percent to deduct.">
                <b-input-group append="%">
                  <b-form-input v-model.number="config.appTaxConfig.percent" number min="1" max="100" placeholder="5" />
                </b-input-group>
              </b-form-group>
            </b-col>
            <b-col cols="4">
              <b-form-group label="Beneficiary" description="Account to receive the deducted rewards.">
                <b-form-input v-model="config.appTaxConfig.beneficiary" placeholder="account" />
              </b-form-group>
            </b-col>
          </b-row>

          <b-form-group label="Disable Downvotes" description="If Yes, downvotes have no effect on post rewards.">
            <b-form-checkbox v-model="config.disableDownvote" switch>{{ config.disableDownvote ? 'Yes' : 'No' }}</b-form-checkbox>
          </b-form-group>

          <b-form-group label="Ignore Declined Payout" description="If Yes, authors can't decline post payouts.">
            <b-form-checkbox v-model="config.ignoreDeclinePayout" switch>{{ config.ignoreDeclinePayout ? 'Yes' : 'No' }}</b-form-checkbox>
          </b-form-group>
        </b-col>
      </b-row>

      <div class="smt-fee text-muted">
        <span>Update fee: <strong>{{ updateFee }} BEE</strong></span>
        <span>Your balance: <strong :class="{ 'text-danger': updateFee > tokenBalance }">{{ tokenBalance }} BEE</strong></span>
      </div>
    </template>

    <template #footer>
      <b-button variant="secondary" @click="ui.hideModal('manageSMTModal')">Cancel</b-button>
      <b-button variant="primary" :disabled="loading || busy || !formValid || updateFee > tokenBalance" @click.prevent="submit">
        <b-spinner v-if="busy" small /> Update
      </b-button>
    </template>
  </b-modal>
</template>

<script>
// Ported from legacy/components/dashboard/modals/ManageSMT.vue.
// vuelidate → lightweight manual validation (safer than nested-config vuelidate v2
// for this deep form); $bvModal + $root events → ui-store modal + watcher; Vuex
// getter smt → useDashboardStore; requestBroadcastJson → tribe store. Broadcasts
// comments.updateRewardPool (Active key).
import { mapState, mapActions } from 'pinia'
import Loading from '@/components/Loading.vue'
import { useUiStore } from '~/stores/ui'
import { useTribeStore } from '~/stores/tribe'
import { useDashboardStore } from '~/stores/dashboard'
import { useAuthStore } from '~/stores/auth'

export default {
  name: 'ManageSMT',

  components: { Loading },

  setup () {
    const config = useRuntimeConfig().public
    const { $sidechain } = useNuxtApp()
    return { appConfig: config, ui: useUiStore(), auth: useAuthStore(), $sidechain }
  },

  data () {
    return {
      curveOptions: [{ value: 'power', text: 'Power (r^a)' }],
      useAppTaxConfig: false,
      rewardPoolId: '',
      config: {},
      tokenBalance: 0,
      updateFee: 0,
      maxTagsPerPool: 5,
      loading: false,
      busy: false
    }
  },

  computed: {
    ...mapState(useDashboardStore, ['smt']),

    formValid () {
      const c = this.config
      return (
        this.okDecimal(c.postRewardCurveParameter) &&
        this.okDecimal(c.curationRewardCurveParameter) &&
        this.okRange(c.curationRewardPercentage, 0, 100) &&
        this.okRange(c.cashoutWindowDays, 1, 30) &&
        this.okRange(c.stakedRewardPercentage, 0, 100) &&
        this.okInterval(c.rewardIntervalSeconds) &&
        this.okDecimalAny(c.rewardPerInterval) &&
        this.okMin(c.voteRegenerationDays, 1) &&
        this.okMin(c.votePowerConsumption, 1) &&
        this.okMin(c.downvoteRegenerationDays, 1) &&
        this.okMin(c.downvotePowerConsumption, 1) &&
        Array.isArray(c.tags) && c.tags.length > 0
      )
    }
  },

  watch: {
    'ui.modals.manageSMTModal' (open) {
      if (open) { this.load() }
    }
  },

  mounted () {
    this.$eventBus.$on('transaction-broadcast-error', this.resetBusy)
  },

  beforeUnmount () {
    this.$eventBus.$off('transaction-broadcast-error', this.resetBusy)
  },

  methods: {
    ...mapActions(useTribeStore, ['requestBroadcastJson']),

    okRange (v, min, max) { return v !== '' && v != null && Number.isFinite(Number(v)) && Number(v) >= min && Number(v) <= max },
    okMin (v, min) { return v !== '' && v != null && Number.isFinite(Number(v)) && Number(v) >= min },
    okDecimal (v) { return v !== '' && v != null && /^\d*(\.\d{0,2})?$/.test(String(v)) && Number(v) > 0 },
    okDecimalAny (v) { return v !== '' && v != null && /^\d*(\.\d+)?$/.test(String(v)) && Number(v) > 0 },
    okInterval (v) { const n = Number(v); return Number.isFinite(n) && n >= 30 && n <= 86400 && n % 3 === 0 },

    tagValidator (tag) {
      return tag === tag.toLowerCase() && tag.length > 1 && tag.length < 24 && /^[a-z][a-z-0-9]+[a-z0-9]$/.test(tag)
    },

    async load () {
      this.loading = true

      try {
        const $sidechain = this.$sidechain

        this.rewardPoolId = this.smt._id

        const config = JSON.parse(JSON.stringify(this.smt.config || {}))

        if (config.appTaxConfig === undefined) {
          config.appTaxConfig = { app: '', percent: '', beneficiary: '' }
        } else {
          this.useAppTaxConfig = true
        }

        if (config.disableDownvote === undefined) { config.disableDownvote = false }
        if (config.ignoreDeclinePayout === undefined) { config.ignoreDeclinePayout = false }
        if (config.excludeTags === undefined) { config.excludeTags = [] }
        if (config.tags === undefined) { config.tags = [] }

        this.config = config

        const username = this.auth.user?.username

        const [params, balance] = await Promise.all([
          $sidechain.getContractParams('comments'),
          username ? $sidechain.getBalance(username, 'BEE') : Promise.resolve(null)
        ])

        this.updateFee = Number(params?.updateFee ?? 0)
        this.maxTagsPerPool = Number(params?.maxTagsPerPool ?? 5)
        this.tokenBalance = balance ? Number(balance.balance) : 0
      } catch (e) {
        this.$notify({ title: 'Error', type: 'error', text: e.message || 'Could not load pool config.' })
      } finally {
        this.loading = false
      }
    },

    submit () {
      if (!this.formValid) { return }

      this.busy = true

      const config = JSON.parse(JSON.stringify(this.config))

      config.postRewardCurveParameter = String(config.postRewardCurveParameter)
      config.curationRewardCurveParameter = String(config.curationRewardCurveParameter)
      config.rewardPerInterval = String(config.rewardPerInterval)
      config.rewardIntervalSeconds = Number(config.rewardIntervalSeconds)
      config.curationRewardPercentage = Number(config.curationRewardPercentage)
      config.cashoutWindowDays = Number(config.cashoutWindowDays)
      config.stakedRewardPercentage = Number(config.stakedRewardPercentage)
      config.voteRegenerationDays = Number(config.voteRegenerationDays)
      config.votePowerConsumption = Number(config.votePowerConsumption)
      config.downvoteRegenerationDays = Number(config.downvoteRegenerationDays)
      config.downvotePowerConsumption = Number(config.downvotePowerConsumption)

      if (!config.excludeTags || config.excludeTags.length <= 0) { delete config.excludeTags }
      if (!this.useAppTaxConfig) {
        delete config.appTaxConfig
      } else {
        config.appTaxConfig.percent = Number(config.appTaxConfig.percent)
      }

      this.requestBroadcastJson({
        id: this.appConfig.SIDECHAIN_ID,
        keyType: 'Active',
        json: {
          contractName: 'comments',
          contractAction: 'updateRewardPool',
          contractPayload: { rewardPoolId: this.rewardPoolId, config }
        },
        message: 'Update Reward Pool',
        eventName: 'smt-reward-pool-update-successful'
      })
    },

    resetBusy () {
      this.busy = false
    },

    onHidden () {
      this.rewardPoolId = ''
      this.useAppTaxConfig = false
      this.config = {}
      this.busy = false
      this.loading = false
    }
  }
}
</script>

<style scoped>
.smt-fee {
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;
  margin-top: 1rem;
  padding-top: .8rem;
  border-top: 1px solid var(--w3-border);
  font-size: .9rem;
}
</style>
