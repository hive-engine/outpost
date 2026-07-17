<template>
  <b-container fluid="lg">
    <template v-if="loading">
      <loading />
    </template>

    <template v-else>
      <template v-if="!isLoggedIn">
        <b-card class="mt-5">
          <div class="h5">
            Please login to update your NFT Marketplace profile.
          </div>

          <b-button variant="primary" class="mt-3" @click.prevent="requestLoginToMarketplace">
            Login
          </b-button>
        </b-card>
      </template>

      <template v-else>
        <b-row>
          <b-col md="6">
            <b-card title="Profile" class="mt-5 h-100">
              <b-alert variant="info" dismissible show>
                Please fill out the profile information before applying to the whitelist, blank applications will be denied.
              </b-alert>

              <b-alert variant="success" dismissible :show="profileUpdated">
                Your profile has been updated successfully.
              </b-alert>

              <b-form-group label-sr-only label="Full Name" label-for="fullname">
                <b-form-input v-model="full_name" placeholder="First and Last Name" />
              </b-form-group>

              <b-form-group label-sr-only label="Bio" label-for="bio">
                <b-form-textarea v-model="bio" placeholder="Bio" />
              </b-form-group>

              <b-form-group label-sr-only label="Location" label-for="location">
                <b-form-input v-model="location" placeholder="Location" />
              </b-form-group>

              <b-form-group label-sr-only label="Website" label-for="website">
                <b-form-input v-model="website" type="url" placeholder="Website" />
              </b-form-group>

              <b-form-group label-sr-only label="Portfolio Link">
                <b-form-input v-model="portfolio" type="url" placeholder="Portfolio Link" />
              </b-form-group>

              <b-form-group label-sr-only label="Instagram Link">
                <b-form-input v-model="instagram" type="url" placeholder="Instagram Link" />
              </b-form-group>

              <b-form-group label-sr-only label="Twitter Link">
                <b-form-input v-model="twitter" type="url" placeholder="Twitter Link" />
              </b-form-group>

              <b-form-group label-sr-only label="SoundCloud Link">
                <b-form-input v-model="soundcloud" type="url" placeholder="SoundCloud Link" />
              </b-form-group>

              <b-button variant="primary" @click="updateProfile">
                Update Profile
              </b-button>
            </b-card>
          </b-col>

          <b-col md="6">
            <b-card title="Apply for Whitelist" class="mt-5 h-100">
              <b-alert v-if="settings.auto_whitelist_enabled" variant="info" dismissible :show="showWhitelistAlert">
                Your whitelist application was successful. Please wait for a few minutes while we process the application.
              </b-alert>

              <b-alert v-else variant="info" dismissible :show="showWhitelistAlert">
                Your whitelist application was successful. Please wait for a moderator to process your application.
              </b-alert>

              <p v-if="profile.whitelisted" class="text-muted">
                You are a whitelisted member.
              </p>

              <p v-else-if="profile.whitelist_applied" class="text-muted">
                We have received your whitelist application. Please wait for a moderator to process your application.
              </p>

              <template v-else>
                <p class="text-muted">
                  To mint NFTs you need to be Whitelisted. Please fill out your profile details and then apply for the whitelist.
                </p>

                <template v-if="settings.auto_whitelist_enabled">
                  <p>You can be whitelisted automatically, if you meet the following requirements.</p>

                  <h6 class="mt-3">
                    Payment Requirement
                  </h6>

                  <client-only placeholder="Loading...">
                    <table class="table table-sm mt-3">
                      <tr>
                        <th>Required</th>
                        <th>Your Balance</th>
                        <th>Filled</th>
                      </tr>

                      <tr>
                        <td>{{ settings.whitelist_payment_requirement.amount }} {{ settings.whitelist_payment_requirement.symbol }}</td>
                        <td>{{ balances[settings.whitelist_payment_requirement.symbol].balance }} {{ settings.whitelist_payment_requirement.symbol }}</td>
                        <td>
                          <fa-icon v-if="balances[settings.whitelist_payment_requirement.symbol].balance >= settings.whitelist_payment_requirement.amount" class="text-success" icon="check" />

                          <fa-icon v-else icon="times" class="text-danger" />
                        </td>
                      </tr>
                    </table>
                  </client-only>

                  <template v-if="Object.keys(settings.whitelist_staking_requirements).length > 0">
                    <h6 class="mt-3">
                      Staking Requirement
                    </h6>

                    <client-only placeholder="Loading...">
                      <table class="table table-sm mt-3">
                        <tr>
                          <th>Required</th>
                          <th>Your Stake</th>
                          <th>Filled</th>
                        </tr>

                        <template v-for="(token, i) of Object.keys(settings.whitelist_staking_requirements)">
                          <tr :key="i">
                            <td>{{ settings.whitelist_staking_requirements[token] }} {{ token }}</td>
                            <td>{{ balances[token].stake }} {{ token }}</td>
                            <td>
                              <fa-icon v-if="balances[token].stake >= settings.whitelist_staking_requirements[token]" class="text-success" icon="check" />

                              <fa-icon v-else icon="times" class="text-danger" />
                            </td>
                          </tr>
                        </template>
                      </table>
                    </client-only>
                  </template>

                  <b-checkbox id="accept_tos" v-model="accept_tos" value="accepted" unchecked-value="not_accepted">
                    I agree to only tokenize contents I created and do not infringe on any copyright. I understand that if I violate the TOS I may be blacklisted from the site.
                  </b-checkbox>

                  <b-button
                    class="mt-3"
                    variant="primary"
                    :disabled="!shouldEnable"
                    @click.prevent="requestApplyForAutoWhitelist"
                  >
                    Apply
                  </b-button>

                  <b-button class="mt-3" variant="info" @click.prevent="requestRefresh">
                    Refresh
                  </b-button>
                </template>

                <template v-else>
                  <b-checkbox id="accept_tos" v-model="accept_tos" value="accepted" unchecked-value="not_accepted">
                    I agree to only tokenize contents I created and do not infringe on any copyright. I understand that if I violate the TOS I may be blacklisted from the site.
                  </b-checkbox>

                  <b-button
                    class="mt-3"
                    variant="primary"
                    :disabled="accept_tos !== 'accepted'"
                    @click.prevent="requestApplyForWhitelist"
                  >
                    Apply
                  </b-button>
                </template>
              </template>
            </b-card>
          </b-col>
        </b-row>
      </template>
    </template>
  </b-container>
</template>

<script>
import { mapGetters, mapActions } from 'vuex'
import { url, maxLength } from 'vuelidate/lib/validators'

export default {
  name: 'MintNFT',

  middleware: 'authenticated',

  data () {
    return {
      full_name: '',
      bio: '',
      location: '',
      website: '',
      instagram: '',
      twitter: '',
      portfolio: '',
      soundcloud: '',

      accept_tos: 'not_accepted',

      profile: {},
      showWhitelistAlert: false,
      profileUpdated: null,

      balances: {}
    }
  },

  async fetch () {
    this.loading = true

    await this.fetchUserInfo()

    const tokens = Array.from(
      new Set([...Object.keys(this.settings.whitelist_staking_requirements), this.settings.whitelist_payment_requirement.symbol])
    )

    this.balances = tokens.reduce((acc, cur) => {
      acc[cur] = { balance: 0, stake: 0 }

      return acc
    }, {})

    if (this.isLoggedIn) {
      const requests = [this.fetchProfile()]

      if (this.settings.auto_whitelist_enabled) {
        requests.unshift(this.$sidechain.getBalance(this.$auth.user.username, tokens))
      }

      const [balances] = await Promise.all(requests)

      if (balances) {
        balances.forEach((balance) => {
          this.balances[balance.symbol] = { balance: Number(balance.balance), stake: Number(balance.stake) }
        })
      }
    }

    this.loading = false
  },

  head () {
    return {
      title: 'User Profile'
    }
  },

  computed: {
    ...mapGetters('nftmarketplace', ['settings', 'isLoggedIn', 'isWhitelisted', 'isAdmin']),

    stakeTokens () {
      return Object.keys(this.settings.whitelist_staking_requirements)
    },

    shouldEnable () {
      const {
        whitelist_payment_requirement: paymentRequirement,
        whitelist_staking_requirements: stakingRequirements
      } = this.settings

      return this.accept_tos === 'accepted' &&
         this.balances[paymentRequirement.symbol].balance >= paymentRequirement.amount &&
         this.stakeTokens.every(t => this.balances[t].stake >= stakingRequirements[t])
    }
  },

  watch: {
    async isLoggedIn (loggedIn) {
      if (loggedIn) {
        await this.fetchProfile()
      }
    }
  },

  mounted () {
    const self = this

    this.$eventBus.$on('nftmarketplace-whitelist-apply-successful', () => {
      self.showWhitelistAlert = true
      self.accept_tos = 'not_accepted'
    })

    this.$eventBus.$on('nftmarketplace-profile-updated', async () => {
      self.profileUpdated = true

      await self.fetchProfile()
    })
  },

  beforeDestroy () {
    this.$eventBus.$off('nftmarketplace-whitelist-apply-successful', 'user-profile-updated')
  },

  methods: {
    ...mapActions('nftmarketplace', ['fetchSettings', 'fetchUserInfo', 'requestLoginToMarketplace', 'requestUpdateProfile', 'requestApplyForWhitelist', 'requestApplyForAutoWhitelist']),

    async fetchProfile () {
      try {
        this.profile = await this.$nftm.$get('users/profile', { params: { username: this.$auth.user.username } })

        this.full_name = this.profile.full_name
        this.bio = this.profile.bio
        this.location = this.profile.location
        this.website = this.profile.website
        this.instagram = this.profile.instagram
        this.twitter = this.profile.twitter
        this.portfolio = this.profile.portfolio
        this.soundcloud = this.profile.soundcloud
      } catch {

      }
    },

    updateProfile () {
      this.profileUpdated = null

      const data = {
        full_name: this.full_name,
        bio: this.bio,
        location: this.location,
        website: this.website,
        instagram: this.instagram,
        twitter: this.twitter,
        portfolio: this.portfolio,
        soundcloud: this.soundcloud
      }

      return this.requestUpdateProfile(data)
    },

    async requestRefresh () {
      await this.fetchSettings()

      await this.$fetch()
    }
  },

  validations: {
    full_name: {
      maxLength: maxLength(255)
    },

    bio: {
      maxLength: maxLength(1000)
    },

    location: {

    },

    website: {
      url
    },

    instagram: {
      url
    },

    twitter: {
      url
    },

    portfolio: {
      url
    },

    soundcloud: {
      url
    }
  }
}
</script>

<style>

</style>
