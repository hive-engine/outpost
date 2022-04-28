<template>
  <div class="app-container">
    <div v-if="$config.SIDECHAIN_ID !== 'ssc-mainnet-hive'" class="bg-info">
      <div class="container-fluid text-center">
        <fa-icon icon="exclamation-circle" /> The website is currently running on Hive-Engine Testnet!
      </div>
    </div>

    <Header />

    <Nuxt />

    <Login />
    <SignUp v-if="$config.OUTPOST_ONBOARD" />

    <sidebar-menu />

    <notifications :duration="15000" />

    <client-only>
      <back-to-top bottom="50px" right="50px">
        <b-button variant="info" class="btn-to-top">
          <fa-icon icon="chevron-up" />
        </b-button>
      </back-to-top>
    </client-only>
  </div>
</template>

<script>
import { mapActions } from 'vuex'
import BackToTop from 'vue-backtotop'
import Header from '@/components/Header.vue'
import Login from '@/components/modals/Login.vue'

export default {
  name: 'MainLayout',

  components: {
    BackToTop,
    Header,
    Login,
    SignUp: () => import(/* webpackChunkName: "SignUpModal" */ '@/components/modals/SignUp.vue'),
    SidebarMenu: () => import(/* webpackChunkName: "SidebarMenu" */ '@/components/SidebarMenu.vue')
  },

  async fetch () {
    await this.fetchTrendingTags()
  },

  async mounted () {
    if (this.$auth.loggedIn) {
      await Promise.all([this.fetchFollowers(), this.fetchFollowing()])
    }

    this.$auth.$storage.watchState('loggedIn', (loggedIn) => {
      if (!loggedIn) {
        this.$cookies.remove('nftm_access_token')
        this.$cookies.remove('nftm_refresh_token')
      }
    })
  },

  methods: {
    ...mapActions('user', ['fetchAccountScotData', 'fetchFollowers', 'fetchFollowing']),
    ...mapActions('scot', ['fetchTrendingTags'])
  },

  timers: {
    fetchAccountScotData: { time: 3 * 60 * 1000, autostart: true, immediate: true, repeat: true }
  }
}
</script>

<style>
.btn-to-top {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  font-size: 25px;
}
</style>
