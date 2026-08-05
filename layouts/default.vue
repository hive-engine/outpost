<template>
  <div class="app-container">
    <div v-if="config.SIDECHAIN_ID !== 'ssc-mainnet-hive'" class="bg-info">
      <div class="container-fluid text-center">
        <fa-icon icon="exclamation-circle" /> The website is currently running on Hive-Engine Testnet!
      </div>
    </div>

    <HiveStatusBanner />

    <KeychainHealthBanner />

    <Header />

    <slot />

    <Login />
    <!-- TODO(P4): SignUp modal (OUTPOST_ONBOARD is false for BBH) -->

    <SidebarMenu />

    <TipModal />

    <ConfirmDialog />

    <client-only>
      <notifications :duration="15000" />
      <BackToTop />
    </client-only>
  </div>
</template>

<script setup>
// Ported from legacy/layouts/default.vue.
// - <Nuxt/> -> <slot/>; vue-timers -> setInterval; $auth.$storage.watchState -> watch()
// - vue-backtotop -> components/app/BackToTop.vue
import Header from '~/components/Header.vue'
import Login from '~/components/modals/Login.vue'
import SidebarMenu from '~/components/SidebarMenu.vue'
import TipModal from '~/components/modals/TipModal.vue'
import ConfirmDialog from '~/components/app/ConfirmDialog.vue'
import BackToTop from '~/components/app/BackToTop.vue'
import { useAuthStore } from '~/stores/auth'
import { useUserStore } from '~/stores/user'
import { useScotStore } from '~/stores/scot'

const config = useRuntimeConfig().public
const auth = useAuthStore()
const userStore = useUserStore()
const scotStore = useScotStore()

// Legacy fetch(): trending tags for the sidebar/nav
await useAsyncData('layout-trending-tags', async () => {
  await scotStore.fetchTrendingTags()
  return true
})

let scotDataTimer = null

onMounted(async () => {
  if (auth.loggedIn) {
    await Promise.all([userStore.fetchFollowers(), userStore.fetchFollowing()])
  }

  // Legacy vue-timers: fetchAccountScotData every 3 min, immediate
  const tick = () => { if (auth.loggedIn) { userStore.fetchAccountScotData() } }
  tick()
  scotDataTimer = setInterval(tick, 3 * 60 * 1000)
})

onUnmounted(() => {
  if (scotDataTimer) { clearInterval(scotDataTimer) }
})

// Legacy $auth.$storage.watchState('loggedIn', ...): clear NFT tokens on logout
watch(() => auth.loggedIn, (loggedIn) => {
  if (!loggedIn) {
    useCookie('nftm_access_token').value = null
    useCookie('nftm_refresh_token').value = null
  }
})
</script>

<style>
.btn-to-top {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  font-size: 25px;
}
</style>
