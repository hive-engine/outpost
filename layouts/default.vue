<template>
  <div class="app-container">
    <Header />

    <Nuxt />

    <Login />

    <notifications :duration="15000" />
  </div>
</template>

<script>
import { mapActions } from 'vuex'
import Header from '@/components/Header.vue'
import Login from '@/components/modals/Login.vue'

export default {
  name: 'MainLayout',

  components: {
    Header,
    Login
  },

  async fetch () {
    await this.fetchTrendingTags()
  },

  async mounted () {
    if (this.$auth.loggedIn) {
      await Promise.all([this.fetchFollowers(), this.fetchFollowing()])
    }
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

</style>
