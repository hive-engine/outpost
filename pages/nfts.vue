<template>
  <div class="nftmarketplace">
    <div class="page-header pb-0">
      <b-container>
        <h2>NFT Marketplace</h2>
      </b-container>

      <b-nav align="center" pills class="bg-light mt-3">
        <b-nav-item :active="$route.name === 'nfts'" :to="{name:'nfts'}">
          Home
        </b-nav-item>

        <b-nav-item :active="$route.name === 'nfts-market'" :to="{name:'nfts-market'}">
          Market
        </b-nav-item>

        <b-nav-item :active="$route.name === 'nfts-activities'" :to="{name:'nfts-activities'}">
          Activities
        </b-nav-item>

        <template v-if="$auth.loggedIn">
          <b-nav-item :active="$route.name === 'nfts-mint'" :to="{name:'nfts-mint'}">
            Mint
          </b-nav-item>

          <b-nav-item :active="$route.name === 'user-collection'" :to="{name:'user-collection', params:{user:$auth.user.username}}">
            Collection
          </b-nav-item>

          <b-nav-item :active="$route.name === 'user-gallery'" :to="{name:'user-gallery', params:{user:$auth.user.username}}">
            Gallery
          </b-nav-item>

          <b-nav-item :active="$route.name === 'nfts-profile'" :to="{name:'nfts-profile', params:{user:$auth.user.username}}">
            Profile
          </b-nav-item>

          <b-nav-item v-if="settings && settings.admins.includes($auth.user.username)" :active="$route.name === 'nfts-admin'" :to="{name:'nfts-admin'}">
            Admin
          </b-nav-item>
        </template>
      </b-nav>
    </div>

    <nuxt-child />

    <activity-modal />
  </div>
</template>

<script>
import { mapGetters, mapActions } from 'vuex'
import NFTMMixin from '@/mixins/nftmarketplace'
import ActivityModal from '@/components/nftmarketplace/modals/Activity.vue'

export default {
  name: 'NFTS',

  components: {
    ActivityModal
  },

  mixins: [NFTMMixin],

  async asyncData ({ error, store }) {
    try {
      await store.dispatch('nftmarketplace/fetchSettings', { root: true })

      if (!store.state.nftmarketplace.settings || !store.state.nftmarketplace.settings.site) {
        return error({ statusCode: 404, message: 'NFT Marketplace settings has not been found!' })
      }
    } catch (error) {
      return error({ statusCode: 404, message: 'NFT Marketplace settings has not been found!' })
    }
  },

  async fetch () {
    await Promise.all([
      this.fetchHivePrice(),
      this.fetchTokenPrice()
    ])
  },

  computed: {
    ...mapGetters('nftmarketplace', ['settings', 'cart'])
  },

  methods: {
    ...mapActions('nftmarketplace', ['fetchHivePrice', 'fetchTokenPrice'])
  },

  timers: {
    fetchHivePrice: { time: 5 * 60 * 1000, autostart: true, immediate: true, repeat: true },
    fetchTokenPrice: { time: 15 * 60 * 1000, autostart: true, immediate: true, repeat: true }
  }
}
</script>

<style>

</style>
