<template>
  <div class="manage-user">
    <h3 class="h4">
      Manage User
    </h3><hr>

    <b-alert :show="show_success" dismissible fade variant="success">
      User update request has been broadcasted.
    </b-alert>

    <b-row>
      <b-col md="7">
        <b-form-group label="Username" label-for="username" label-sr-only>
          <b-form-input v-model="username" placeholder="Username" trim />
        </b-form-group>
      </b-col>

      <b-col md="5">
        <b-button variant="primary" :disabled="username.length < 3" @click.prevent="fetchProfile">
          Lookup
        </b-button>
      </b-col>
    </b-row>

    <template v-if="loading">
      <loading :small="true" />
    </template>

    <template v-else>
      <template v-if="!not_found">
        <table class="table mt-3">
          <tr>
            <th>Username</th>
            <td colspan="2">
              {{ username }}
            </td>
          </tr>
          <tr>
            <th class="w-25">
              Whitelisted
            </th>
            <td class="w-25">
              {{ whitelisted ? "Yes" : "No" }}
            </td>
            <td>
              <b-form-checkbox v-model="whitelisted" name="whitelisted" switch />
            </td>
          </tr>
          <tr>
            <th class="w-25">
              Whitelist Applied
            </th>
            <td class="w-25">
              {{ whitelist_applied ? "Yes" : "No" }}
            </td>
            <td />
          </tr>
          <tr>
            <th class="w-25">
              Banned
            </th>
            <td class="w-25">
              {{ banned ? "Yes" : "No" }}
            </td>
            <td>
              <b-form-checkbox v-model="banned" name="banned" switch />
            </td>
          </tr>
          <tr v-if="banned">
            <th class="w-25">
              Ban Reason
            </th>
            <td class="w-25">
              {{ ban_reason }}
            </td>
            <td>
              <b-form-textarea v-model="ban_reason" placeholder="Enter a reason..." />
            </td>
          </tr>
        </table>

        <p class="text-right">
          <b-button variant="primary" :disabled="username.length < 3" @click.prevent="manageUser">
            Update User
          </b-button>
        </p>
      </template>

      <b-alert class="mt-2" dismissible :show="not_found">
        User not found!
      </b-alert>
    </template>
  </div>
</template>

<script>
import { mapActions } from 'vuex'

export default {
  name: 'ManageUser',

  data () {
    return {
      username: '',
      admin: false,
      banned: false,
      whitelisted: false,
      whitelist_applied: false,
      ban_reason: '',
      not_found: false,
      show_success: false
    }
  },

  mounted () {
    this.$eventBus.$on('manage-user-successful', () => {
      this.show_success = true
    })
  },

  beforeDestroy () {
    this.$eventBus.$off('manage-user-successful')
  },

  methods: {
    ...mapActions('nftmarketplace', ['requestManageUser']),

    async fetchProfile () {
      this.loading = true

      try {
        const profile = await this.$nftm.$get('users/profile', { params: { username: this.username } })

        if (profile && profile.username) {
          const { admin, whitelisted, whitelist_applied: whitelistApplied, banned, ban_reason: banReason } = profile

          this.admin = admin
          this.whitelisted = whitelisted
          this.whitelist_applied = whitelistApplied
          this.banned = banned
          this.ban_reason = banReason

          this.not_found = false
        } else {
          this.not_found = true
        }
      } catch (e) {
        console.log(e.message)
      }

      this.loading = false
    },

    manageUser () {
      const data = {
        username: this.username,
        ban: this.banned,
        whitelist: this.whitelisted,
        ban_reason: this.ban_reason
      }

      this.requestManageUser(data)
    }
  }
}
</script>

<style>
</style>
