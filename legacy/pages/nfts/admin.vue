<template>
  <div class="nftmarketplace-admin">
    <b-container fluid="lg">
      <template v-if="!isLoggedIn">
        <b-card class="mt-5">
          <div class="h5">
            Please login to NFT Marketplace.
          </div>

          <b-button variant="primary" class="mt-3" @click.prevent="requestLoginToMarketplace">
            Login
          </b-button>
        </b-card>
      </template>

      <template v-else>
        <b-card no-body class="mt-3">
          <b-tabs
            card
            pills
            vertical
            lazy
            nav-class="p-2"
            nav-wrapper-class="col-12 col-md-3 col-lg-2"
            content-class="col-12 col-md-9 col-lg-10"
            active-tab-class="p-2"
          >
            <b-tab title="Dashboard" active>
              <dashboard />
            </b-tab>

            <b-tab title="Manage User">
              <manage-user />
            </b-tab>

            <b-tab title="Manage Collectible">
              <manage-collectible />
            </b-tab>

            <b-tab title="Users">
              <users />
            </b-tab>

            <b-tab title="Collectibles">
              <collectibles />
            </b-tab>

            <b-tab title="Applications">
              <applications />
            </b-tab>

            <b-tab title="Reports">
              <reports />
            </b-tab>

            <b-tab title="Issue Manually">
              <manual-issue />
            </b-tab>

            <b-tab v-if="settings.official_nft_enabled" title="Official NFTs">
              <official-nfts />
            </b-tab>
          </b-tabs>
        </b-card>
      </template>
    </b-container>
  </div>
</template>

<script>
import { mapGetters, mapActions } from 'vuex'
import Dashboard from '@/components/nftmarketplace/admin/Dashboard.vue'
import ManageCollectible from '@/components/nftmarketplace/admin/ManageCollectible.vue'
import ManageUser from '@/components/nftmarketplace/admin/ManageUser.vue'
import Users from '@/components/nftmarketplace/admin/Users.vue'
import Collectibles from '@/components/nftmarketplace/admin/Collectibles.vue'
import Applications from '@/components/nftmarketplace/admin/Applications.vue'
import Reports from '@/components/nftmarketplace/admin/Reports.vue'
import ManualIssue from '@/components/nftmarketplace/admin/ManualIssue.vue'
import OfficialNfts from '@/components/nftmarketplace/admin/OfficialNfts.vue'

export default {
  name: 'AdminPanel',

  components: {
    Dashboard,
    ManageCollectible,
    ManageUser,
    Users,
    Collectibles,
    Applications,
    Reports,
    ManualIssue,
    OfficialNfts
  },

  middleware: 'authenticated',

  computed: {
    ...mapGetters('nftmarketplace', ['settings', 'isLoggedIn'])
  },

  methods: {
    ...mapActions('nftmarketplace', ['requestLoginToMarketplace'])
  }
}
</script>

<style>

</style>
