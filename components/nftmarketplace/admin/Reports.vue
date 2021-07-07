<template>
  <div class="reports">
    <h3 class="h4">
      Reports
    </h3><hr>

    <template v-if="loading">
      <loading :small="true" />
    </template>

    <template v-else>
      <b-table
        striped
        responsive
        show-empty
        :items="reports"
        :fields="fields"
      >
        <template #cell(series)="{item}">
          <nuxt-link :to="{ name: 'nfts-series', params: { series: item.series }}" target="_blank">
            {{ item.series }}
          </nuxt-link>
        </template>

        <template #cell(actions)="{item}">
          <b-button variant="success" size="sm" title="Processed" @click.prevent="requestProcessReport({ report_id: item.report_id })">
            <fa-icon icon="check" /> Processed
          </b-button>
        </template>
      </b-table>
    </template>
  </div>
</template>

<script>
import { mapActions } from 'vuex'

export default {
  name: 'Reports',

  data () {
    return {
      reports: [],
      fields: [
        { key: 'series', label: 'Series' },
        { key: 'type', label: 'Type' },
        { key: 'username', label: 'User' },
        { key: 'message', label: 'Message' },
        { key: 'actions', label: '' }
      ]
    }
  },

  async fetch () {
    this.loading = true

    this.reports = await this.$nftm.$get('admin/reports')

    this.loading = false
  },

  mounted () {
    const self = this

    this.$eventBus.$on('process-report-successful', (data) => {
      this.reports = self.reports.filter(a => a.report_id !== data.report_id)
    })
  },

  beforeDestroy () {
    this.$eventBus.$off('process-report-successful')
  },

  methods: {
    ...mapActions('nftmarketplace', ['requestProcessReport'])
  }
}
</script>

<style>
</style>
