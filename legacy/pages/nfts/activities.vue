<template>
  <b-container fluid="lg">
    <template v-if="loading">
      <loading />
    </template>

    <template v-else-if="items.length >0">
      <div v-for="(history, i) of items" :key="i" class="mt-5">
        <nft-th :history="history" />
      </div>

      <client-only>
        <infinite-loading :identifier="infiniteId" spinner="waveDots" @infinite="infiniteHandler">
          <div slot="error" slot-scope="{ trigger }">
            Something went wrong! click <a href="javascript:;" @click="trigger">here</a> to retry.
          </div>

          <div slot="no-more">
            <div class="mt-5">
              You have reached the end! :)
            </div>
          </div>

          <div slot="no-results" />
        </infinite-loading>
      </client-only>
    </template>

    <b-card v-else class="mt-3">
      No recent cctivities has been found!
    </b-card>
  </b-container>
</template>

<script>
import InfiniteLoading from 'vue-infinite-loading'
import NftTh from '@/components/nftmarketplace/NftTH.vue'

export default {
  name: 'Activities',

  components: {
    InfiniteLoading,
    NftTh
  },

  data () {
    return {
      infiniteId: 1,
      items: [],

      limit: 10,
      page: 1
    }
  },

  async fetch () {
    this.loading = true

    const items = await this.fetchActivities()

    this.items.push(...items)

    this.page += 1

    this.loading = false
  },

  head () {
    return {
      title: 'Activities'
    }
  },

  methods: {
    async fetchActivities () {
      const params = {
        page: this.page,
        limit: this.limit,
        types: 'buy'
      }

      return await this.$nftm.$get('transactions/history', { params })
    },

    async infiniteHandler ($state) {
      try {
        const items = await this.fetchActivities()

        if (items.length) {
          this.page += 1

          this.items.push(...items)

          if ($state) { $state.loaded() }
        } else if ($state) { $state.complete() }
      } catch (e) {
        console.log(e)
      }
    }
  }
}
</script>

<style>

</style>
