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
      <b-list-group-item target="_blank" href="https://hivelist.io">
        Home <fa-icon icon="external-link-alt" />
      </b-list-group-item>
      <b-list-group-item target="_blank" href="https://hivelist.io/tokenomics">
        Tokenomics <fa-icon icon="external-link-alt" />
      </b-list-group-item>
      <b-list-group-item target="_blank" href="https://store.hivelist.io">
        Store <fa-icon icon="external-link-alt" />
      </b-list-group-item>
      <b-list-group-item v-if="$config.NFT_ENABLED" :to="{name:'nfts'}">
        NFTs
      </b-list-group-item>

      <b-list-group-item v-if="$config.DTF_ENABLED" :to="{name:'proposals'}">
        Proposals
      </b-list-group-item>

      <b-list-group-item v-if="$config.POOL_ENABLED" :to="{name:'pool'}">
        Swap
      </b-list-group-item>
      
       <b-list-group-item class="font-weight-bold" disabled>
       Classifieds
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
      <b-list-group-item :to="{name:'sort-tag', params:{ sort:'created', tag:'forsale'}}">
        For Sale
      </b-list-group-item>
      <b-list-group-item :to="{name:'sort-tag', params:{ sort:'created', tag:'forhire'}}">
        For Hire
      </b-list-group-item>
      <b-list-group-item :to="{name:'sort-tag', params:{ sort:'created', tag:'nowhiring'}}">
        Now Hiring
      </b-list-group-item>
      <b-list-group-item :to="{name:'sort-tag', params:{ sort:'created', tag:'contest'}}">
        Contest
      </b-list-group-item>
      <b-list-group-item :to="{name:'sort-tag', params:{ sort:'created', tag:'event'}}">
        Event
      </b-list-group-item>
      <b-list-group-item :to="{name:'sort-tag', params:{ sort:'created', tag:'fundraising'}}">
        Fundraising
      </b-list-group-item>
      <b-list-group-item :to="{name:'sort-tag', params:{ sort:'created', tag:'housing'}}">
        Housing
      </b-list-group-item>
      <b-list-group-item :to="{name:'sort-tag', params:{ sort:'created', tag:'wanted'}}">
        Wanted
      </b-list-group-item>
    </b-list-group>

    <b-list-group class="mt-3" flush>
       <b-list-group-item class="font-weight-bold" disabled>
       Classified Post Templates
      </b-list-group-item>
      <b-list-group-item target="_blank" href="https://www.hivelist.org/@hivelist/for-sale-category-post-template-for-hivelist-classifieds">
        For Sale <fa-icon icon="external-link-alt" />
      </b-list-group-item>

      <b-list-group-item target="_blank" href="https://www.hivelist.org/@hivelist/for-hire-category-post-template-for-the-hivelist-classifieds">
        For Hire <fa-icon icon="external-link-alt" />
      </b-list-group-item>

      <b-list-group-item target="_blank" href="https://www.hivelist.org/@hivelist/hivelist-post-rzt5h5">
        Now Hiring <fa-icon icon="external-link-alt" />
      </b-list-group-item>

      <b-list-group-item target="_blank" href="https://www.hivelist.org/@hivelist/contest-post-template-for-the-hivelist-classifieds">
        Contest <fa-icon icon="external-link-alt" />
      </b-list-group-item>

      <b-list-group-item target="_blank" href="https://www.hivelist.org/@hivelist/event-post-template-for-the-hivelist-classifieds-netwo">
        Event <fa-icon icon="external-link-alt" />
      </b-list-group-item>

      <b-list-group-item target="_blank" href="https://www.hivelist.org/@hivelist/fundraising-template-for-the-hivelist-classifieds">
        Fundraising <fa-icon icon="external-link-alt" />
      </b-list-group-item>

      <b-list-group-item target="_blank" href="https://www.hivelist.org/@hivelist/housin-template-for-the-hivelist-classifieds">
        Housing <fa-icon icon="external-link-alt" />
      </b-list-group-item>

      <b-list-group-item target="_blank" href="https://www.hivelist.org/@hivelist/wanted-template-for-the-hivelist-classifieds">
        Wanted <fa-icon icon="external-link-alt" />
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
