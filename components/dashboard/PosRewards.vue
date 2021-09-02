<template>
  <div>
    <template v-if="scot">
      <p>You are using SCOT for staking and mining rewards. Update your SCOT bot staking/mining parameters on <a href="https://tribaldex.com/scotbot" target="_blank">Tribaldex</a>.</p>

      <p>If you want to use the new Mining Contract for both staking and mining rewards, please disable SCOT bot staking and mining.</p>
    </template>

    <template v-else>
      <p>The mining contract allows token issuer to set up "mining pools" that give token stakers a chance to earn tokens via a lottery system. Token issuer can specify the same token as the mining token, in which case it behaves like 'proof of stake', or you can specify a different token, in which case it behaves like 'proof of staked mining'. It is also possible to add NFT as a miner.</p>

      <table v-if="pools.length > 0" class="table table-striped">
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
              <div v-for="({symbol,multiplier}, k) of pool.tokenMiners" :key="k">
                <span class="text-muted">Token:</span> {{ symbol }}<br>
                <span class="text-muted">Multiplier:</span> {{ multiplier }}
              </div>

              <div v-if="pool.nftTokenMiner">
                <span class="text-muted">NFT:</span> {{ pool.nftTokenMiner.symbol }}
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

              <b-button size="sm" variant="primary" @click.prevent="REQUEST_EDIT({type:'pool', payload: pool})">
                Edit
              </b-button>
            </td>
          </tr>
        </tbody>
      </table>

      <div class="text-center">
        <b-button variant="info" @click.prevent="$bvModal.show('createMiningPoolModal')">
          Create
        </b-button>
      </div>
    </template>

    <create-mining-pool />
    <manage-mining-pool />
  </div>
</template>

<script>
import { mapActions, mapMutations } from 'vuex'
import CreateMiningPool from '@/components/dashboard/modals/CreateMiningPool.vue'
import ManageMiningPool from '@/components/dashboard/modals/ManageMiningPool.vue'

export default {
  name: 'PoSRewards',

  components: {
    CreateMiningPool,
    ManageMiningPool
  },

  props: {
    scot: { type: Boolean, default: false },
    pools: { type: Array, required: true }
  },

  methods: {
    ...mapActions('dashboard', ['requestActivate']),
    ...mapMutations('dashboard', ['REQUEST_EDIT'])
  }
}
</script>

<style>

</style>
