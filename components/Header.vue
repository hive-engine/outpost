<template>
  <header>
    <b-navbar fixed="top" variant="light">
      <b-container fluid>
        <b-navbar-brand to="/">
          <img src="/logo.png" class="logo">
        </b-navbar-brand>

        <b-navbar-nav class="d-none d-md-flex">
          <client-only>
            <b-nav-item @click.prevent="changeColorMode">
              <template v-if="colorMode.value === 'light'">
                <fa-icon :icon="['far', 'moon']" />
              </template>

              <template v-else>
                <fa-icon :icon="['far', 'sun']" />
              </template>
            </b-nav-item>
          </client-only>
        </b-navbar-nav>

        <b-navbar-nav class="d-none d-lg-flex">
          <b-nav-item v-if="auth.loggedIn" :to="{ name: 'user-feed', params: { user: auth.user.username } }">
            Feed
          </b-nav-item>
          <b-nav-item :to="{ name: 'sort', params: { sort: 'trending' } }">
            Explore
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
          <b-nav-item v-if="config.NFT_ENABLED && $route.name && ($route.name.startsWith('nfts') || ['user-collection', 'user-gallery', 'user-collection-series', 'user-gallery-series'].includes($route.name))" link-classes="navbar-btn rounded" @click.prevent="ui.showModal('activityModal')">
            <fa-icon icon="shopping-basket" />

            <div class="cart-item-count badge text-bg-primary">
              {{ nftm.cart.length }}
            </div>
          </b-nav-item>

          <template v-if="auth.loggedIn">
            <b-nav-item :to="{ name: 'publish' }" link-classes="navbar-btn rounded">
              <fa-icon icon="pencil-alt" />
            </b-nav-item>

            <b-nav-item-dropdown variant="link" no-caret end>
              <template #button-content>
                <div class="d-flex align-items-center">
                  <b-avatar :src="`https://images.hive.blog/u/${auth.user.username}/avatar`" variant="dark" size="32px" class="me-2" />

                  <div>{{ auth.user.username }} <fa-icon class="ms-1" icon="angle-down" /></div>
                </div>

                <div id="voting_power">
                  <b-progress variant="primary" :value="userStore.voting_power" max="10000" height="2px" class="mt-1" />
                  <b-progress variant="danger" :value="userStore.downvoting_power" max="10000" height="2px" class="mt-1" />
                </div>
              </template>

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

          <b-nav-item v-b-toggle.sidebar-menu link-classes="ms-2 me-0 navbar-btn rounded">
            <fa-icon icon="bars" />
          </b-nav-item>
        </b-navbar-nav>
      </b-container>
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

const config = useRuntimeConfig().public
const colorMode = useColorMode()
const auth = useAuthStore()
const userStore = useUserStore()
const tribe = useTribeStore()
const nftm = useNftMarketplaceStore()
const ui = useUiStore()

const urlA = 'https://inleo.io/signup?referral=borniet'
const urlB = 'https://inleo.io/signup?referral=bradleyarrow'
const targetUrl = computed(() => (Math.random() < 0.5 ? urlA : urlB))

const changeColorMode = () => {
  colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
}
</script>
