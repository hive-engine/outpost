<template>
  <div class="whitelist-applications">
    <h3 class="h4">
      Whitelist Applications
    </h3><hr>

    <template v-if="loading">
      <loading :small="true" />
    </template>

    <template v-else>
      <b-table
        striped
        responsive
        show-empty
        :items="applications"
        :fields="fields"
      >
        <template #cell(social_profiles)="{item}">
          <ul class="list-unstyled mb-0">
            <li v-if="item.website">
              <a target="_blank" :href="`${item.website}`">{{ item.website }}</a>
            </li>

            <li v-if="item.portfolio">
              <a target="_blank" :href="`${item.portfolio}`">{{ item.portfolio }}</a>
            </li>

            <li v-if="item.instagram">
              <a target="_blank" :href="`${item.instagram}`">{{ item.instagram }}</a>
            </li>

            <li v-if="item.twitter">
              <a target="_blank" :href="`${item.twitter}`">{{ item.twitter }}</a>
            </li>

            <li v-if="item.soundcloud">
              <a target="_blank" :href="`${item.soundcloud}`">{{ item.soundcloud }}</a>
            </li>
          </ul>
        </template>
        <template #cell(actions)="{item}">
          <b-button
            variant="primary"
            size="sm"
            title="Accept"
            @click.prevent="requestProcessApplication({ username: item.username, action:'approve', value: true })"
          >
            <fa-icon icon="check" />
          </b-button>

          <b-button
            variant="danger"
            size="sm"
            title="Reject"
            @click.prevent="requestProcessApplication({ username: item.username, action:'approve', value: false })"
          >
            <fa-icon icon="times" />
          </b-button>
        </template>
      </b-table>
    </template>
  </div>
</template>

<script>
import { mapActions } from 'vuex'

export default {
  name: 'WhitelistApplications',

  data () {
    return {
      applications: [],

      fields: [
        { key: 'username', label: 'User' },
        { key: 'bio', label: 'Bio' },
        { key: 'location', label: 'Location' },
        { key: 'social_profiles', label: 'Socials' },
        { key: 'actions', label: '' }
      ]
    }
  },

  async fetch () {
    this.loading = true

    this.applications = await this.$nftm.$get('admin/whitelist-applications')

    this.loading = false
  },

  mounted () {
    const self = this

    this.$eventBus.$on('process-application-succesful', ({ username, action, value }) => {
      self.applications = self.applications.reduce((acc, cur) => {
        if (cur.username === username) {
          if (action === 'approve') {
            cur.whitelisted = value
            cur.application_pending = false

            if (!value) {
              cur.whitelist_applied = false
            }
          } else if (action === 'pending') {
            cur.application_pending = value
          }
        }

        acc.push(cur)

        return acc
      }, []).filter(w => !w.whitelisted && w.whitelist_applied)
    })
  },

  beforeDestroy () {
    this.$eventBus.$off('process-application-succesful')
  },

  methods: {
    ...mapActions('nftmarketplace', ['requestProcessApplication'])
  }
}
</script>

<style>
</style>
