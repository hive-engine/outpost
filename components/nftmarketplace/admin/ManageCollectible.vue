<template>
  <div class="manage-collectible">
    <h3 class="h4">
      Manage Collectible
    </h3><hr>

    <b-alert :show="show_success" dismissible fade variant="success">
      Collectible update request has been broadcasted.
    </b-alert>

    <b-row>
      <b-col md="7">
        <b-form-group label="Collectible Series" label-for="series" label-sr-only>
          <b-form-input v-model="series" placeholder="Collectible series" trim />
        </b-form-group>
      </b-col>

      <b-col md="5">
        <b-button variant="primary" :disabled="series.length < 3" @click.prevent="fetchCollectible">
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
            <th>Series</th>
            <td colspan="2">
              {{ series }}
            </td>
          </tr>
          <tr>
            <th class="w-25">
              NSFW
            </th>
            <td class="w-25">
              {{ nsfw ? "Yes" : "No" }}
            </td>
            <td>
              <b-form-checkbox v-model="nsfw" name="nsfw" switch />
            </td>
          </tr>
          <tr>
            <th class="w-25">
              Published
            </th>
            <td class="w-25">
              {{ published ? "Yes" : "No" }}
            </td>
            <td>
              <b-form-checkbox v-model="published" name="published" switch />
            </td>
          </tr>
        </table>

        <p class="text-right">
          <b-button variant="primary" :disabled="series.length < 3" @click.prevent="manageCollectible">
            Update
          </b-button>
        </p>
      </template>

      <b-alert class="mt-2" dismissible :show="not_found">
        Collectible was not found!
      </b-alert>
    </template>
  </div>
</template>

<script>
import { mapActions } from 'vuex'

export default {
  name: 'ManageCollectible',

  middleware: 'admin',

  data () {
    return {
      series: '',
      creator: '',
      nsfw: false,
      published: true,
      not_found: false,
      show_success: false
    }
  },

  mounted () {
    this.$eventBus.$on('manage-collectible-successful', () => {
      this.show_success = true
    })
  },

  beforeDestroy () {
    this.$eventBus.$off('manage-collectible-successful')
  },

  methods: {
    ...mapActions('nftmarketplace', ['requestManageCollectible']),

    async fetchCollectible () {
      this.loading = true

      try {
        const collectible = await this.$nftm.$get('collectibles/info', { params: { series: this.series } })

        if (collectible) {
          const { creator, nsfw, published } = collectible
          this.creator = creator
          this.nsfw = nsfw
          this.published = published

          this.not_found = false
        } else {
          this.not_found = true
        }
      } catch (e) {
        console.log(e.message)
      }

      this.loading = false
    },

    manageCollectible () {
      const data = {
        series: this.series,
        nsfw: this.nsfw,
        published: this.published
      }

      this.requestManageCollectible(data)
    }
  }
}
</script>

<style>
</style>
