<template>
  <div>
    <template v-if="scot">
      You are currently using SCOT bot. Update your SCOT bot parameters on <a href="https://tribaldex.com/scotbot" target="_blank">Tribaldex</a>.
    </template>

    <template v-else>
      <table class="table table-striped">
        <thead>
          <tr>
            <th>Symbol</th>
            <th>Reward Pool</th>
            <th>Config</th>
            <th>Active</th>
            <th />
          </tr>
        </thead>

        <tbody>
          <tr v-for="(pool, i) of pools" :key="i">
            <td>
              {{ pool.symbol }}
            </td>

            <td>{{ Number(pool.rewardPool) }}</td>

            <td>
              <span class="text-muted">Author/Curator:</span> {{ 100 - pool.config.curationRewardPercentage }}% / {{ pool.config.curationRewardPercentage }}%<br>
              <span class="text-muted">Cashout:</span> {{ pool.config.cashoutWindowDays }} days<br>
              <span class="text-muted">Tags:</span> {{ pool.config.tags.join(', ') }}
            </td>

            <td>{{ pool.active? 'Yes': 'No' }}</td>

            <td class="text-right">
              <b-button size="sm" :variant="`${pool.active ? 'danger' : 'success'}`" @click="requestActivate({type:'smt', id: pool._id, active: !pool.active})">
                {{ pool.active? 'Deactivate': 'Activate' }}
              </b-button>

              <b-button size="sm" variant="primary" @click.prevent="REQUEST_EDIT({type:'smt', payload: pool})">
                Edit
              </b-button>
            </td>
          </tr>
        </tbody>
      </table>
    </template>

    <manage-smt />
  </div>
</template>

<script>
import { mapActions, mapMutations } from 'vuex'
import ManageSmt from '@/components/dashboard/modals/ManageSMT.vue'

export default {
  name: 'PoBRewards',

  components: {
    ManageSmt
  },

  props: {
    scot: { type: Boolean, default: false },
    pools: { type: Array, required: true }
  },

  data () {
    return {
      selectedSmt: {}
    }
  },

  methods: {
    ...mapActions('dashboard', ['requestActivate']),
    ...mapMutations('dashboard', ['REQUEST_EDIT'])
  }
}
</script>

<style>

</style>
