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
      <b-list-group-item target="_blank" :href="`https://blocktunes.net`">
       Home <fa-icon icon="external-link-alt" />
      </b-list-group-item>
      
      <b-list-group-item :href="`https://hive.blocktunes.net/@blocktunes`">
       Blog
      </b-list-group-item>

      <b-list-group-item v-if="$auth.loggedIn" :to="{name:'user-feed', params:{user: $auth.user.username}}">
        My Feed
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
      <b-list-group-item v-if="$config.POOL_ENABLED" :to="{name:'pool'}">
        Pool
      </b-list-group-item>
    </b-list-group>

    <b-list-group class="mt-3" flush>

      <b-list-group-item class="font-weight-bold" disabled>
        Trade on Tribaldex
      </b-list-group-item>
      <b-list-group-item target="_blank" :href="`https://tribaldex.com/trade/${$config.TOKEN}`">
        Trade ${{ $config.TOKEN }} Token <fa-icon icon="external-link-alt" />
      </b-list-group-item>
      <b-list-group-item class="font-weight-bold" disabled>
        EVM NFTs and Smart Contracts
      </b-list-group-item>
      <b-list-group-item target="_blank" :href="`https://blocktunes.dexkit.app/`">
       Launch EVM App <fa-icon icon="external-link-alt" />
      </b-list-group-item>
      
      <b-list-group-item class="font-weight-bold" disabled>
        Links
      </b-list-group-item>
      <b-list-group-item :href="`https://blocktunes.net/services/`">
        Services <fa-icon icon="external-link-alt" />
      </b-list-group-item>
      <b-list-group-item :href="`https://blocktunes.net/media-kit/`">
       Media Kit <fa-icon icon="external-link-alt" />
      </b-list-group-item>
      <b-list-group-item target="_blank" :href="`https://discord.gg/EA5rG9GdPG`">
       Discord <fa-icon icon="external-link-alt" />
      </b-list-group-item>
      <b-list-group-item target="_blank" :href="`https://twitter.com/BlockTunesDAO`">
       Twitter <fa-icon icon="external-link-alt" />
      </b-list-group-item>
      <b-list-group-item target="_blank" :href="`https://www.facebook.com/blocktunes`">
       Facebook <fa-icon icon="external-link-alt" />
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
