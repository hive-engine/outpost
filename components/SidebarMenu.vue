<template>
  <b-sidebar
    id="sidebar-menu"
    right
    shadow
    bg-variant="dark"
    text-variant="light"
    class="sidebar-menu"
    backdrop
  >
    <b-list-group class="d-lg-none" flush>
      <b-list-group-item class="font-weight-bold" disabled>
        Menu
      </b-list-group-item>

      <b-list-group-item v-if="$auth.loggedIn" :to="{name:'user-feed', params:{user: $auth.user.username}}">
        Feed
      </b-list-group-item>

      <b-list-group-item :to="{name:'sort', params:{sort:'trending'}}">
        Explore
      </b-list-group-item>

      <b-list-group-item v-if="$config.CURATED_FEED && $config.CURATED_FEED_ACCOUNT !== ''" :to="{name:'sort', params:{sort:'curated'}}">
        Curator's Pick
      </b-list-group-item>

      <b-list-group-item v-if="$config.NFT_ENABLED" :to="{name:'nfts'}">
        NFTs
      </b-list-group-item>

      <b-list-group-item v-if="$config.DTF_ENABLED" :to="{name:'proposals'}">
        Proposals
      </b-list-group-item>

      <b-list-group-item v-if="$config.POOL_ENABLED" :to="{name:'pool'}">
        Pool
      </b-list-group-item>
    </b-list-group>

    <b-list-group class="mt-3" flush>
      <b-list-group-item :to="{name:'about'}">
        About
      </b-list-group-item>

      <b-list-group-item :to="{name:'philosophy-and-inventions'}">
        Philosophy and Inventions
      </b-list-group-item>

      <b-list-group-item :to="{name:'videos'}">
        Videos
      </b-list-group-item>

      <b-list-group-item :to="{name:'shop'}">
        Shop
      </b-list-group-item>

      <b-list-group-item :to="{name:'promotion'}">
        Promotion
      </b-list-group-item>

      <b-list-group-item :to="{name:'faq'}">
        FAQ
      </b-list-group-item>

      <b-list-group-item :to="{name:'lasseehlers-nfts'}">
        Lasse Ehlers NFTs
      </b-list-group-item>

      <b-list-group-item :to="{name:'cash'}">
        Cash
      </b-list-group-item>
    </b-list-group>

    <b-list-group class="mt-3" flush>
      <b-list-group-item target="_blank" href="https://tribaldex.com/dieselpools">
        Pools <fa-icon icon="external-link-alt" />
      </b-list-group-item>

      <b-list-group-item target="_blank" :href="`https://tribaldex.com/trade/${$config.TOKEN}`">
        Market <fa-icon icon="external-link-alt" />
      </b-list-group-item>

      <b-list-group-item target="_blank" href="https://discord.gg/aqeRcR7HPh">
        Discord <fa-icon icon="external-link-alt" />
      </b-list-group-item>

      <b-list-group-item target="_blank" href="https://primersion.com/he-witnesses">
        Witness <fa-icon icon="external-link-alt" />
      </b-list-group-item>

      <b-list-group-item target="_blank" href="https://dswap.trade">
        Dswap <fa-icon icon="external-link-alt" />
      </b-list-group-item>
    </b-list-group>

    <template #footer>
      <div class="text-center pb-2 d-md-none">
        <b-button size="sm" @click.prevent="changeColorMode">
          <template v-if="$colorMode.value === 'light'">
            <fa-icon :icon="['far', 'moon']" /> Dark Mode
          </template>

          <template v-else>
            <fa-icon :icon="['far', 'sun']" /> Light Mode
          </template>
        </b-button>
      </div>
    </template>
  </b-sidebar>
</template>

<script>
export default {
  name: 'SidebarMenu',

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

<style lang="scss">
.sidebar-menu {
  .svg-inline--fa.fa-external-link-alt {
    width: 12px;
    margin-left: 5px;
    padding-top: 3px;
  }
}
</style>
