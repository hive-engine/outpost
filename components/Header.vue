<template>
  <header>
    <b-navbar fixed="top" type="light" variant="light">
      <b-container fluid>
        <b-navbar-brand to="/" class="d-flex align-items-center">
          <div class="lassecash-brand-logo d-flex align-items-center">
            <div class="logo-box">
              <span class="logo-text">L</span>
            </div>
            <div class="brand-text-container ml-2.5 d-none d-sm-block">
              <span class="brand-title">LASSECASH</span>
              <span class="brand-subtitle">AnCap society tools</span>
            </div>
          </div>
        </b-navbar-brand>

        <b-navbar-nav class="d-none d-md-flex">
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

        <b-navbar-nav class="d-none d-lg-flex">
          <b-nav-item v-if="$auth.loggedIn" :to="{name:'user-feed', params:{user: $auth.user.username}}">
            Feed
          </b-nav-item>
          <b-nav-item :to="{name:'sort', params:{sort:'trending'}}">
            Explore
          </b-nav-item>
          <b-nav-item v-if="$config.CURATED_FEED && $config.CURATED_FEED_ACCOUNT !== ''" :to="{name:'sort', params:{sort:'curated'}}">
            Curator's Pick
          </b-nav-item>
          <b-nav-item v-if="$config.NFT_ENABLED" :to="{name:'nfts'}">
            NFTs
          </b-nav-item>
          <b-nav-item v-if="$config.DTF_ENABLED" :to="{name:'proposals'}">
            Proposals
          </b-nav-item>
          <b-nav-item v-if="$config.POOL_ENABLED" :to="{name:'pool'}">
            Pool
          </b-nav-item>
        </b-navbar-nav>

        <b-navbar-nav class="ml-auto align-items-center">
          <b-nav-item v-if="$config.NFT_ENABLED && $route.name && ($route.name.startsWith('nfts') || ['user-collection', 'user-gallery', 'user-collection-series', 'user-gallery-series'].includes($route.name))" link-classes="navbar-btn rounded" @click.prevent="$bvModal.show('activityModal')">
            <fa-icon icon="shopping-basket" />

            <div class="cart-item-count badge badge-primary">
              {{ cart.length }}
            </div>
          </b-nav-item>

          <template v-if="$auth.loggedIn">
            <b-nav-item :to="{ name:'publish' }" link-classes="navbar-btn rounded">
              <fa-icon icon="pencil-alt" />
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

              <b-dropdown-item v-if="$auth.user.username === issuer" :to="{ name:'dashboard' }">
                Dashboard
              </b-dropdown-item>

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

          <template v-else>
            <b-nav-item @click.prevent="$bvModal.show('loginModal')">
              Login
            </b-nav-item>

            <b-nav-item v-if="$config.OUTPOST_ONBOARD" @click.prevent="$bvModal.show('signupModal')">
              Sign up
            </b-nav-item>

            <b-nav-item v-else target="_blank" href="https://signup.hive.io/?ref=lasseehlers">
              Sign up
            </b-nav-item>
          </template>

          <b-nav-item v-b-toggle.sidebar-menu link-classes="ml-2 mr-0 navbar-btn rounded">
            <fa-icon icon="bars" />
          </b-nav-item>
        </b-navbar-nav>
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

  head() {
    return {
      link: [
        {
          rel: 'icon',
          type: 'image/svg+xml',
          href: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='6' fill='black' stroke='%23facc15' stroke-width='2'/><text x='50%' y='55%' dominant-baseline='central' text-anchor='middle' font-family='monospace' font-weight='900' font-size='20' fill='%23facc15'>L</text></svg>"
        }
      ]
    }
  },

  computed: {
    ...mapGetters(['issuer']),
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

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');

.lassecash-brand-logo {
  text-decoration: none;
  font-family: 'Inter', sans-serif;
}

.logo-box {
  width: 42px;
  height: 42px;
  background-color: #000000;
  border: 2px solid #facc15;
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 10px 15px -3px rgba(250, 204, 21, 0.1);
}

.logo-text {
  font-family: monospace;
  font-weight: 900;
  font-size: 1.5rem;
  color: #facc15;
  letter-spacing: -0.05em;
  line-height: 1;
}

.brand-text-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  line-height: 1.15;
}

.brand-title {
  font-family: 'Inter', sans-serif;
  font-weight: 900;
  font-size: 1.25rem;
  letter-spacing: 0.05em;
  color: #111827;
}

.brand-subtitle {
  font-family: 'Inter', sans-serif;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.1em;
  color: #facc15;
  text-transform: uppercase;
}

/* Dark mode adjustments */
.dark-mode .brand-title {
  color: #f9fafb;
}
</style>
