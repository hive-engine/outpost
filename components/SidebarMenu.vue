<template>
  <b-offcanvas
    id="sidebar-menu"
    placement="end"
    class="sidebar-menu text-bg-dark"
    backdrop
  >
    <b-list-group class="d-lg-none" flush>
      <b-list-group-item class="fw-bold" disabled>
        Menu
      </b-list-group-item>

      <b-list-group-item v-if="auth.loggedIn" :to="{ name: 'user-feed', params: { user: auth.user.username } }">
        Feed
      </b-list-group-item>

      <b-list-group-item :to="{ name: 'sort', params: { sort: 'trending' } }">
        Explore
      </b-list-group-item>

      <b-list-group-item v-if="config.CURATED_FEED && config.CURATED_FEED_ACCOUNT !== ''" :to="{ name: 'sort', params: { sort: 'curated' } }">
        Curator's Pick
      </b-list-group-item>

      <b-list-group-item v-if="config.NFT_ENABLED" :to="{ name: 'nfts' }">
        NFTs
      </b-list-group-item>

      <b-list-group-item v-if="config.DTF_ENABLED" :to="{ name: 'proposals' }">
        Proposals
      </b-list-group-item>

      <b-list-group-item v-if="config.POOL_ENABLED" :to="{ name: 'pool' }">
        Pool
      </b-list-group-item>
    </b-list-group>

    <b-list-group class="mt-3" flush>
      <b-list-group-item class="fw-bold" disabled>
        Trade
      </b-list-group-item>

      <b-list-group-item target="_blank" :href="`https://tribaldex.com/trade/${config.TOKEN}`">
        Trade {{ config.TOKEN }} <fa-icon icon="external-link-alt" />
      </b-list-group-item>
    </b-list-group>

    <template #footer>
      <div class="text-center pb-2 d-md-none">
        <b-button size="sm" @click.prevent="changeColorMode">
          <template v-if="colorMode.value === 'light'">
            <fa-icon :icon="['far', 'moon']" /> Dark Mode
          </template>

          <template v-else>
            <fa-icon :icon="['far', 'sun']" /> Light Mode
          </template>
        </b-button>
      </div>
    </template>
  </b-offcanvas>
</template>

<script setup>
// Ported from legacy/components/SidebarMenu.vue.
// bvn has no BSidebar — BOffcanvas replaces it (right→placement="end";
// bg/text-variant→text-bg-dark class). BS4 font-weight-bold → BS5 fw-bold.
import { useAuthStore } from '~/stores/auth'

const config = useRuntimeConfig().public
const colorMode = useColorMode()
const auth = useAuthStore()

const changeColorMode = () => {
  colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
}
</script>

<style lang="scss">
.sidebar-menu {
  .svg-inline--fa.fa-external-link-alt {
    width: 12px;
    margin-left: 5px;
    padding-top: 3px;
  }
}
</style>
