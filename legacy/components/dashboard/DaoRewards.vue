<template>
  <div>
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
              <b-button size="sm" :variant="`${fund.active ? 'danger' : 'success'}`" @click.prevent="requestActivate({type:'fund', id: fund.id, active: !fund.active})">
                {{ fund.active? 'Deactivate': 'Activate' }}
              </b-button>

              <b-button v-if="fund.active" size="sm" variant="primary" @click.prevent="REQUEST_EDIT({type:'fund', payload: fund})">
                Edit
              </b-button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <b-card v-else class="text-center">
      No DAO found!
    </b-card>

    <div class="text-center">
      <b-button variant="info" @click.prevent="$bvModal.show('createDaoModal')">
        Create
      </b-button>
    </div>
  </div>
</template>

<script>
import { mapActions, mapMutations } from 'vuex'

export default {
  name: 'LPRewards',

  props: {
    funds: { type: Array, required: true }
  },

  data () {
    return {
      loading: true,
      modalBusy: false
    }
  },

  methods: {
    ...mapActions(['requestBroadcastJson', 'showConfirmation']),
    ...mapActions('dashboard', ['requestActivate']),
    ...mapMutations('dashboard', ['REQUEST_EDIT'])
  }
}
</script>

<style>

</style>
