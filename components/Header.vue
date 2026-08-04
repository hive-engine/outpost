<template>
  <header>
    <b-navbar fixed="top" variant="light" container="fluid" class="navbar-light">
      <!-- bootstrap-vue-next's <b-navbar> already renders its own .container-fluid
           (a direct navbar child, which BS5 makes flex). A nested <b-container> here
           would be a block container → brand + nav lists stack vertically. -->
      <b-navbar-brand to="/">
        <img src="/logo.png" class="logo">
      </b-navbar-brand>

        <b-navbar-nav class="d-none d-lg-flex">
          <b-nav-item v-if="auth.loggedIn" :to="{ name: 'user-feed', params: { user: auth.user.username } }">
            Feed
          </b-nav-item>
          <b-nav-item :to="{ name: 'sort', params: { sort: 'trending' } }">
            Explore
          </b-nav-item>
          <b-nav-item v-if="config.CHATS_ENABLED" :to="{ name: 'chats' }">
            Chats
          </b-nav-item>
          <b-nav-item :to="{ name: 'shorts' }">
            Shorts
          </b-nav-item>
          <b-nav-item v-if="config.CURATED_FEED && config.CURATED_FEED_ACCOUNT !== ''" :to="{ name: 'sort', params: { sort: 'curated' } }">
            Curator's Pick
          </b-nav-item>
          <b-nav-item v-if="config.NFT_ENABLED" :to="{ name: 'nfts' }">
            NFTs
          </b-nav-item>
          <b-nav-item v-if="config.DTF_ENABLED" :to="{ name: 'proposals' }">
            Proposals
          </b-nav-item>
          <b-nav-item v-if="config.POOL_ENABLED" :to="{ name: 'pool' }">
            Pool
          </b-nav-item>
        </b-navbar-nav>

        <b-navbar-nav class="ms-auto align-items-center">
          <b-nav-item :to="{ name: 'search' }" link-classes="navbar-btn rounded" title="Search">
            <fa-icon icon="search" />
          </b-nav-item>

          <b-nav-item link-classes="navbar-btn rounded" :title="isDark ? 'Switch to light mode' : 'Switch to dark mode'" @click.prevent="toggleTheme">
            <fa-icon :icon="isDark ? 'sun' : 'moon'" />
          </b-nav-item>

          <b-nav-item v-if="config.NFT_ENABLED && $route.name && ($route.name.startsWith('nfts') || ['user-collection', 'user-gallery', 'user-collection-series', 'user-gallery-series'].includes($route.name))" link-classes="navbar-btn rounded" @click.prevent="ui.showModal('activityModal')">
            <fa-icon icon="shopping-basket" />

            <div class="cart-item-count badge text-bg-primary">
              {{ nftm.cart.length }}
            </div>
          </b-nav-item>

          <template v-if="auth.loggedIn">
            <b-nav-item :to="{ name: 'notifications' }" link-classes="navbar-btn rounded" title="Notifications">
              <fa-icon icon="bell" />

              <div v-if="notif.unreadCount" class="notif-count badge text-bg-danger">
                {{ notif.unreadCount > 99 ? '99+' : notif.unreadCount }}
              </div>
            </b-nav-item>

            <b-nav-item :to="{ name: 'publish' }" link-classes="navbar-btn rounded">
              <fa-icon icon="pencil-alt" />
            </b-nav-item>

            <b-nav-item-dropdown variant="link" no-caret end>
              <template #button-content>
                <div class="d-flex align-items-center">
                  <b-avatar :src="`https://images.hive.blog/u/${auth.user.username}/avatar`" variant="dark" size="32px" class="me-2" />

                  <div>{{ auth.user.username }} <fa-icon class="ms-1" icon="angle-down" /></div>
                </div>

                <div id="voting_power" :title="powerTitle">
                  <b-progress variant="primary" :value="userStore.voting_power" max="10000" height="2px" class="mt-1" />
                  <b-progress variant="danger" :value="userStore.downvoting_power" max="10000" height="2px" class="mt-1" />
                </div>
              </template>

              <b-dropdown-text class="power-readout">
                ⚡ Voting <b>{{ (userStore.voting_power / 100).toFixed(1) }}%</b> · Downvote <b>{{ (userStore.downvoting_power / 100).toFixed(1) }}%</b>
              </b-dropdown-text>
              <b-dropdown-divider />

              <b-dropdown-item v-if="auth.user.username === tribe.issuer" :to="{ name: 'dashboard' }">
                Dashboard
              </b-dropdown-item>

              <b-dropdown-item :to="{ name: 'user', params: { user: auth.user.username } }">
                Profile
              </b-dropdown-item>

              <b-dropdown-item :to="{ name: 'user-comments', params: { user: auth.user.username } }">
                Comments
              </b-dropdown-item>

              <b-dropdown-item :to="{ name: 'user-replies', params: { user: auth.user.username } }">
                Replies
              </b-dropdown-item>

              <b-dropdown-item :to="{ name: 'user-wallet', params: { user: auth.user.username } }">
                Wallet
              </b-dropdown-item>

              <b-dropdown-item :to="{ name: 'user-settings', params: { user: auth.user.username } }">
                Settings
              </b-dropdown-item>

              <b-dropdown-item @click.prevent="auth.logout()">
                Logout
              </b-dropdown-item>
            </b-nav-item-dropdown>
          </template>

          <template v-else>
            <b-nav-item @click.prevent="ui.showModal('loginModal')">
              Login!
            </b-nav-item>

            <b-nav-item v-if="config.OUTPOST_ONBOARD" @click.prevent="ui.showModal('signupModal')">
              Sign up
            </b-nav-item>

            <b-nav-item v-else target="_blank" :href="targetUrl">
              Sign up
            </b-nav-item>
          </template>

          <b-nav-item link-classes="ms-2 me-0 navbar-btn rounded" @click.prevent="ui.showModal('sidebarMenu')">
            <fa-icon icon="bars" />
          </b-nav-item>
        </b-navbar-nav>
    </b-navbar>

    <b-tooltip v-if="auth.loggedIn" target="voting_power" placement="bottom">
      Voting Power: {{ (userStore.voting_power / 100).toFixed(2) }}%<br>
      Downvoting Power: {{ (userStore.downvoting_power / 100).toFixed(2) }}%
    </b-tooltip>
  </header>
</template>

<script setup>
// Ported from legacy/components/Header.vue.
// BS4→BS5: ml-*→ms-*, mr-*→me-*, badge-primary→text-bg-primary; b-navbar `type` dropped;
// dropdown right→end. $bvModal.show→ui.showModal. Stray <style> inside the legacy
// template (bad merge on the bbhproject branch) removed.
import { useAuthStore } from '~/stores/auth'
import { useUserStore } from '~/stores/user'
import { useTribeStore } from '~/stores/tribe'
import { useNftMarketplaceStore } from '~/stores/nftmarketplace'
import { useUiStore } from '~/stores/ui'
import { useNotificationsStore } from '~/stores/notifications'
import { useBookmarksStore } from '~/stores/bookmarks'

const config = useRuntimeConfig().public
const auth = useAuthStore()
const userStore = useUserStore()
const tribe = useTribeStore()
const nftm = useNftMarketplaceStore()
const ui = useUiStore()
const notif = useNotificationsStore()
const bookmarks = useBookmarksStore()

// Light/dark toggle (@nuxtjs/color-mode injects $colorMode; toggles the
// .light-mode / .dark-mode class on <html>, which flips the --w3-* palette).
const { $colorMode } = useNuxtApp()
const isDark = computed(() => $colorMode.value !== 'light')
const toggleTheme = () => { $colorMode.preference = $colorMode.value === 'light' ? 'dark' : 'light' }

// Native title so the voting-power readout also works on touch/devices where a
// hover tooltip never fires (jongo: couldn't see his mana on iOS/Brave).
const powerTitle = computed(() => `Voting Power: ${(userStore.voting_power / 100).toFixed(1)}% · Downvote Power: ${(userStore.downvoting_power / 100).toFixed(1)}%`)

// Keep the bell badge (unread count) fresh while logged in; load bookmarks once
// so the save-for-later state is correct on every post.
let notifTimer = null
const startNotifPolling = () => {
  if (import.meta.server) { return }
  notif.fetch()
  bookmarks.fetch()
  if (!notifTimer) { notifTimer = setInterval(() => notif.fetch(), 60000) }
}
const stopNotifPolling = () => { if (notifTimer) { clearInterval(notifTimer); notifTimer = null } }

onMounted(() => { if (auth.loggedIn) { startNotifPolling() } })
onBeforeUnmount(stopNotifPolling)
watch(() => auth.loggedIn, (loggedIn) => {
  if (loggedIn) { startNotifPolling() } else { stopNotifPolling(); notif.reset(); bookmarks.reset() }
})

const urlA = 'https://inleo.io/signup?referral=borniet'
const urlB = 'https://inleo.io/signup?referral=bradleyarrow'
// useState: the random pick happens once on the server and is reused on the client,
// so the rendered href matches (a plain Math.random() computed mismatches on hydration).
const targetUrl = useState('signup-referral-url', () => (Math.random() < 0.5 ? urlA : urlB))
</script>
