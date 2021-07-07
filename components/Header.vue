<template>
  <header>
    <b-navbar toggleable="md" fixed="top" type="light" variant="light">
      <b-container fluid>
        <b-navbar-brand to="/">
          <img src="/logo.png" class="logo">
        </b-navbar-brand>

        <b-navbar-nav>
          <client-only>
            <b-nav-item @click.prevent="changeColorMode">
              <template v-if="$colorMode.value === 'light'">
                <fa-icon :icon="['far', 'moon']" />
              </template>

              <template v-else>
                <fa-icon :icon="['far', 'sun']" />
              </template>
            </b-nav-item>
          </client-only>
        </b-navbar-nav>

        <b-navbar-toggle target="nav-collapse" />

        <b-collapse id="nav-collapse" is-nav>
          <b-navbar-nav>
            <b-nav-item v-if="$auth.loggedIn" :to="{name:'user-feed', params:{user: $auth.user.username}}">
              Feed
            </b-nav-item>
            <b-nav-item :to="{name:'sort', params:{sort:'trending'}}">
              Explore
            </b-nav-item>
            <b-nav-item v-if="$config.CURATED_FEED && $config.CURATED_FEED_ACCOUNT !== ''" :to="{name:'sort', params:{sort:'curated'}}">
              Curator's Pick
            </b-nav-item>
            <b-nav-item :to="{name:'nfts'}">
              NFTs
            </b-nav-item>
          </b-navbar-nav>

          <b-navbar-nav class="ml-auto align-items-md-center">
            <b-nav-item v-if="$config.NFT_ENABLED && $route.name && ($route.name.startsWith('nfts') || ['user-collection', 'user-gallery', 'user-collection-series', 'user-gallery-series'].includes($route.name))" link-classes="navbar-btn" @click.prevent="$bvModal.show('activityModal')">
              <div class="d-none d-md-block">
                <fa-icon icon="shopping-basket" />
              </div> <span class="d-md-none">Basket</span>
              <div class="cart-item-count badge badge-primary">
                {{ cart.length }}
              </div>
            </b-nav-item>

            <template v-if="$auth.loggedIn">
              <b-nav-item :to="{ name:'publish' }" link-classes="navbar-btn">
                <div class="d-none d-md-block">
                  <fa-icon icon="pencil-alt" />
                </div> <span class="d-md-none">Publish</span>
              </b-nav-item>

              <b-nav-item-dropdown variant="link" no-caret right>
                <template #button-content>
                  <div class="d-flex align-items-center">
                    <b-avatar :src="`https://images.hive.blog/u/${$auth.user.username}/avatar`" variant="dark" size="32px" class="mr-2" />

                    <div>{{ $auth.user.username }} <fa-icon class="ml-1" icon="angle-down" /></div>
                  </div>

                  <div id="voting_power">
                    <b-progress variant="primary" :value="voting_power" max="10000" height="2px" class="mt-1" />
                    <b-progress variant="danger" :value="downvoting_power" max="10000" height="2px" class="mt-1" />
                  </div>
                </template>

                <b-dropdown-item :to="{ name:'user', params: {user: $auth.user.username} }">
                  Profile
                </b-dropdown-item>

                <b-dropdown-item :to="{ name:'user-comments', params: {user: $auth.user.username} }">
                  Comments
                </b-dropdown-item>

                <b-dropdown-item :to="{ name:'user-replies', params: {user: $auth.user.username} }">
                  Replies
                </b-dropdown-item>

                <b-dropdown-item :to="{ name:'user-wallet', params: {user: $auth.user.username} }">
                  Wallet
                </b-dropdown-item>

                <b-dropdown-item :to="{ name:'user-settings', params: {user: $auth.user.username} }">
                  Settings
                </b-dropdown-item>

                <b-dropdown-item @click.prevent="$auth.logout()">
                  Logout
                </b-dropdown-item>
              </b-nav-item-dropdown>
            </template>

            <b-nav-item v-else @click.prevent="$bvModal.show('loginModal')">
              Login
            </b-nav-item>
          </b-navbar-nav>
        </b-collapse>
      </b-container>
    </b-navbar>

    <b-tooltip v-if="$auth.loggedIn" target="voting_power" placement="bottom">
      Voting Power: {{ (voting_power /100).toFixed(2) }}%<br>
      Downvoting Power: {{ (downvoting_power / 100).toFixed(2) }}%
    </b-tooltip>
  </header>
</template>

<script>
import { mapGetters } from 'vuex'

export default {
  name: 'Header',

  computed: {
    ...mapGetters('user', ['voting_power', 'downvoting_power']),
    ...mapGetters('nftmarketplace', ['cart'])
  },

  methods: {
    changeColorMode () {
      if (this.$colorMode.value === 'dark') {
        this.$colorMode.preference = 'light'
      } else {
        this.$colorMode.preference = 'dark'
      }
    }
  }
}
</script>

<style>

</style>
