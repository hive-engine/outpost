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
      
       <b-list-group-item class="font-weight-bold" disabled>
       Categories
      </b-list-group-item>
      <b-list-group-item :to="{name:'sort-tag', params:{ sort:'created', tag:'forsale'}}">
        ForSale
      </b-list-group-item>
      <b-list-group-item :to="{name:'sort-tag', params:{ sort:'created', tag:'contests'}}">
        Contests
      </b-list-group-item>
      <b-list-group-item :to="{name:'sort-tag', params:{ sort:'created', tag:'services'}}">
        Services
      </b-list-group-item>
      <b-list-group-item :to="{name:'sort-tag', params:{ sort:'created', tag:'gigs'}}">
        Gigs
      </b-list-group-item>
      <b-list-group-item :to="{name:'sort-tag', params:{ sort:'created', tag:'events'}}">
        Events
      </b-list-group-item>
      <b-list-group-item :to="{name:'sort-tag', params:{ sort:'created', tag:'fundraising'}}">
        Fundraising
      </b-list-group-item>
      <b-list-group-item :to="{name:'sort-tag', params:{ sort:'created', tag:'hivecommerce'}}">
        HiveCommerce
      </b-list-group-item>
    </b-list-group>

    <b-list-group class="mt-3" flush>
       <b-list-group-item class="font-weight-bold" disabled>
       Hivelist.io
      </b-list-group-item>
      <b-list-group-item target="_blank" href="https://hivelist.io">
        Home <fa-icon icon="external-link-alt" />
      </b-list-group-item>

      <b-list-group-item target="_blank" href="https://hivelist.io/classifieds">
        Classifieds <fa-icon icon="external-link-alt" />
      </b-list-group-item>

      <b-list-group-item target="_blank" href="https://hivelist.io/nft-marketplace">
        NFT Market Hub <fa-icon icon="external-link-alt" />
      </b-list-group-item>

      <b-list-group-item target="_blank" href="https://hivelist.io/list-token">
        LIST Token <fa-icon icon="external-link-alt" />
      </b-list-group-item>

      <b-list-group-item target="_blank" href="https://hivelist.store">
        Hivelist Store <fa-icon icon="external-link-alt" />
      </b-list-group-item>

      <b-list-group-item class="font-weight-bold" disabled>
        Trade
      </b-list-group-item>

      <b-list-group-item target="_blank" :href="`https://tribaldex.com/trade/${$config.TOKEN}`">
        Trade {{ $config.TOKEN }} <fa-icon icon="external-link-alt" />
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
