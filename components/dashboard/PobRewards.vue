<template>
  <div>
    <template v-if="scot">
      <p class="text-muted mb-0">
        You are currently using SCOT bot. Update your SCOT bot parameters on
        <a href="https://tribaldex.com/scotbot" target="_blank" rel="noopener">Tribaldex</a>.
      </p>
    </template>

    <template v-else-if="pools.length">
      <div class="table-responsive">
        <table class="table dash-table align-middle">
          <thead>
            <tr>
              <th>Symbol</th>
              <th>Reward Pool</th>
              <th>Config</th>
              <th>Active</th>
              <th class="text-end" />
            </tr>
          </thead>
          <tbody>
            <tr v-for="(pool, i) of pools" :key="i">
              <td class="fw-bold">{{ pool.symbol }}</td>
              <td class="mono">{{ Number(pool.rewardPool).toLocaleString() }}</td>
              <td class="small">
                <span class="text-muted">Author / Curator:</span> {{ 100 - pool.config.curationRewardPercentage }}% / {{ pool.config.curationRewardPercentage }}%<br>
                <span class="text-muted">Cashout:</span> {{ pool.config.cashoutWindowDays }} days<br>
                <span class="text-muted">Emission:</span> {{ pool.config.rewardPerInterval }} every {{ pool.config.rewardIntervalSeconds }}s<br>
                <span class="text-muted">Tags:</span> {{ pool.config.tags.join(', ') }}
              </td>
              <td>
                <b-badge :variant="pool.active ? 'success' : 'secondary'">{{ pool.active ? 'Yes' : 'No' }}</b-badge>
              </td>
              <td class="text-end text-nowrap">
                <b-button size="sm" :variant="pool.active ? 'outline-danger' : 'outline-success'" @click="requestActivate({ type: 'smt', id: pool._id, active: !pool.active })">
                  {{ pool.active ? 'Deactivate' : 'Activate' }}
                </b-button>
                <b-button size="sm" variant="primary" class="ms-2" @click.prevent="REQUEST_EDIT({ type: 'smt', payload: pool })">
                  <fa-icon icon="pencil-alt" /> Edit
                </b-button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <p v-else class="text-muted mb-0">No reward pool found for {{ appConfig.TOKEN }}.</p>

    <manage-smt />
  </div>
</template>

<script>
// Ported from legacy/components/dashboard/PobRewards.vue.
// Vuex dashboard actions/mutations → useDashboardStore (requestActivate, editSmt);
// bootstrap table styling via .dash-table (Web3 theme).
import { mapActions } from 'pinia'
import ManageSmt from '@/components/dashboard/ManageSMT.vue'
import { useDashboardStore } from '~/stores/dashboard'

export default {
  name: 'PobRewards',

  components: { ManageSmt },

  props: {
    scot: { type: Boolean, default: false },
    pools: { type: Array, required: true }
  },

  setup () {
    return { appConfig: useRuntimeConfig().public }
  },

  methods: {
    ...mapActions(useDashboardStore, ['requestActivate', 'REQUEST_EDIT'])
  }
}
</script>
