<template>
  <div class="admin-dashboard">
    <h3 class="h4">
      Dashboard
    </h3><hr>

    <template v-if="loading">
      <loading :small="true" />
    </template>

    <template v-else>
      <line-chart class="mt-3 mb-3" :data="chartData" />

      <b-table striped :items="statistics" :fields="fields" />

      <p class="text-muted">
        * Sales volume is in {{ settings.currency }}
      </p>
    </template>
  </div>
</template>

<script>
import { mapGetters } from 'vuex'
import LineChart from '@/components/charts/LineChart.vue'

export default {
  name: 'Dashboard',

  components: {
    LineChart
  },

  data () {
    return {
      fields: [
        { key: 'timestamp', label: 'Date', formatter: v => v.toDateString() },
        { key: 'users', label: 'Users' },
        { key: 'total_transactions', label: 'Transactions' },
        { key: 'sales_volume', label: 'Sales Volume', formatter: v => parseFloat(v).toFixed(3) }
      ],
      colors: {
        red: '#f94e3f',
        purple: '#6C49B8',
        green: '#3ac569'
      },
      statistics: [],
      chartData: {}
    }
  },

  async fetch () {
    this.loading = true

    const statistics = await this.$nftm.$get('statistics', { params: { days: 30 } })

    this.statistics = statistics.map(h => ({ ...h, timestamp: new Date(h.timestamp) }))

    this.produceChart()

    this.loading = false
  },

  computed: {
    ...mapGetters('nftmarketplace', ['settings'])
  },

  methods: {
    produceChart () {
      const data = this.statistics.slice().reverse()

      const labels = data.map(s => new Date(s.timestamp).toLocaleDateString())

      const datasets = data.reduce((a, c) => {
        a[0].push(c.users)
        a[1].push(c.sales_volume)
        a[2].push(c.total_transactions)

        return a
      }, [[], [], []])

      this.chartData = {
        labels,
        datasets: [
          {
            label: 'Users',
            backgroundColor: this.colors.red,
            borderColor: this.colors.red,
            data: datasets[0],
            fill: true
          },
          {
            label: 'Sales Volume',
            backgroundColor: this.colors.purple,
            borderColor: this.colors.purple,
            data: datasets[1],
            fill: true
          },
          {
            label: 'Transactions',
            backgroundColor: this.colors.green,
            borderColor: this.colors.green,
            data: datasets[2],
            fill: true
          }
        ]
      }
    }
  }
}
</script>

<style>
</style>
