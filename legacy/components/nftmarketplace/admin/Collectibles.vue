<template>
  <div class="collectibles">
    <h3 class="h4">
      Collectibles
    </h3><hr>

    <b-row align-h="between">
      <b-col sm="6" md="3" align-self="center">
        <span class="font-weight-bold">Total: {{ totalRows }}</span>
      </b-col>

      <b-col sm="6" md="3">
        <b-form-group label="Filters">
          <b-form-select v-model="filter.filter" :options="filterOptions" />
        </b-form-group>
      </b-col>
    </b-row>

    <b-table
      striped
      responsive
      show-empty
      :items="itemsProvider"
      :fields="fields"
      :per-page="perPage"
      :current-page="currentPage"
      sort-by="created_at"
      :sort-desc="true"
      :filter="filter"
    >
      <template #cell(thumbnail)="{item}">
        <nft style="width:150px;height:150px !important;" :small="true" :nft="item" />
      </template>

      <template #cell(name)="{item}">
        <nuxt-link :to="{ name: 'nfts-series', params: { series: item.series }}" target="_blank">
          {{ item.name }}
        </nuxt-link>

        <p class="m-0 small text-muted">
          Series: {{ item.series }}
        </p>
      </template>

      <template #cell(published)="{item}">
        {{ item.published ? "Yes" : "No" }}
      </template>

      <template #cell(featured)="{item}">
        {{ item.featured ? "Yes" : "No" }}
      </template>

      <template #cell(nsfw)="{item}">
        {{ item.nsfw ? "Yes" : "No" }}
      </template>

      <template #cell(created_at)="{item}">
        {{ new Date(item.created_at).toLocaleString() }}
      </template>

      <template #cell(actions)="{item}">
        <b-button v-if="item.published && !item.featured" variant="warning" size="sm" @click.passive="featureCollectible(item.series, true)">
          Feature
        </b-button>

        <b-button v-if="item.featured" variant="info" size="sm" @click.passive="featureCollectible(item.series, false)">
          Unfeature
        </b-button>
      </template>
    </b-table>

    <b-pagination v-model="currentPage" class="mt-3" align="center" :total-rows="totalRows" :per-page="perPage" />
  </div>
</template>

<script>
import { mapActions } from 'vuex'
import Nft from '@/components/nftmarketplace/Nft.vue'

export default {
  name: 'AllCollectibles',

  components: {
    Nft
  },

  data () {
    return {
      currentPage: 1,
      perPage: 30,
      totalRows: 30,
      filter: {
        filter: null
      },
      fields: [
        { key: 'thumbnail', label: '' },
        { key: 'name', label: 'Name' },
        { key: 'published', label: 'Published' },
        { key: 'featured', label: 'Featured' },
        { key: 'nsfw', label: 'NSFW' },
        { key: 'created_at', label: 'Created At', sortable: true },
        { key: 'actions', label: '' }
      ],
      filterOptions: [
        { value: null, text: '--' },
        { value: { published: true }, text: 'Published' },
        { value: { published: false }, text: 'Unpublished' },
        { value: { featured: true }, text: 'Featured' },
        { value: { featured: false }, text: 'Not Featured' }
      ]
    }
  },

  mounted () {
    this.$eventBus.$on('feature-collectible-successful', (data) => {
      this.$notify({ title: 'Success', text: 'We have received your request', type: 'success' })
    })
  },

  beforeDestroy () {
    this.$eventBus.$off('feature-collectible-successful')
  },

  methods: {
    ...mapActions('nftmarketplace', ['requestFeatureCollectible']),

    async itemsProvider (ctx) {
      let params = {
        page: ctx.currentPage,
        limit: ctx.perPage,
        sort_by: ctx.sortBy,
        descending: ctx.sortDesc
      }

      if (ctx.filter.filter) {
        params = { ...params, ...ctx.filter.filter }
      }

      try {
        const { total, results } = await this.$nftm.$get('admin/collectibles', { params })

        this.totalRows = total

        return results
      } catch (e) {
        console.log(e.message)
      }

      return []
    },

    featureCollectible (series, featured) {
      return this.requestFeatureCollectible({
        series,
        featured
      })
    }
  }
}
</script>

<style>
</style>
