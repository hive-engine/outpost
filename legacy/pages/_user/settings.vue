<template>
  <div class="user-settings">
    <b-container fluid="lg">
      <template v-if="loading">
        <loading />
      </template>

      <template v-else>
        <b-form-row class="mt-5">
          <b-col sm="6" md="4" class="mt-3">
            <b-form-group label="Profile Picture URL">
              <b-form-input v-model="profilePic" class="mb-2" />

              <b-form-file
                ref="profilePicFile"
                v-model="profilePicFile"
                name="profilePic"
                class="d-none"
                plain
                accept="image/*"
                @change="onFileChange($event.target.name, $event.target.files)"
              />

              <a class="cursor-pointer" @click="$refs.profilePicFile.$el.click()">Upload an image</a>
            </b-form-group>
          </b-col>

          <b-col sm="6" md="4" class="mt-3">
            <b-form-group label="Cover Image URL">
              <b-form-input v-model="coverPic" class="mb-2" />

              <b-form-file
                ref="coverPicFile"
                v-model="coverPicFile"
                name="coverPic"
                class="d-none"
                plain
                accept="image/*"
                @change="onFileChange($event.target.name, $event.target.files)"
              />

              <a class="cursor-pointer" @click="$refs.coverPicFile.$el.click()">Upload an image</a>
            </b-form-group>
          </b-col>

          <b-col sm="6" md="4" class="mt-3">
            <b-form-group label="Display Name">
              <b-form-input v-model="name" />
            </b-form-group>
          </b-col>

          <b-col sm="6" md="4" class="mt-3">
            <b-form-group label="About">
              <b-form-input v-model="about" />
            </b-form-group>
          </b-col>

          <b-col sm="6" md="4" class="mt-3">
            <b-form-group label="Location">
              <b-form-input v-model="location" />
            </b-form-group>
          </b-col>

          <b-col sm="6" md="4" class="mt-3">
            <b-form-group label="Website">
              <b-form-input v-model="website" />
            </b-form-group>
          </b-col>
        </b-form-row>

        <b-button variant="primary" :disabled="!$auth.loggedIn" @click.prevent="updateAccount">
          Update
        </b-button>

        <b-row class="mt-5">
          <b-col sm="6" md="4">
            <b-form-group :label="`${$config.IS_HIVE ? 'Hive':'Steem'} RPC Node`">
              <b-form-select v-model="mainchainNode" :options="mainchainNodeOptions" />
            </b-form-group>
          </b-col>

          <b-col sm="6" md="4">
            <b-form-group label="Not Safe for Work (NSFW) Content">
              <b-form-select v-model="nsfwPref" :options="nsfwPrefOptions" />
            </b-form-group>
          </b-col>
        </b-row>
      </template>
    </b-container>
  </div>
</template>

<script>
import { mapActions } from 'vuex'

export default {
  name: 'Settings',

  middleware: 'authenticated',

  data () {
    return {
      profile: {},

      profilePic: '',
      coverPic: '',
      name: '',
      about: '',
      location: '',
      website: '',

      profilePicFile: null,
      coverPicFile: null,

      mainchainNode: '',

      nsfwPref: 'warn',
      nsfwPrefOptions: [{ value: 'show', text: 'Always Show' }, { value: 'warn', text: 'Always Warn' }]
    }
  },

  async fetch () {
    this.loading = true

    const data = await this.$chain.client.hivemind.call('get_profile', { account: this.$auth.user.username })

    if (data && data.metadata && data.metadata.profile) {
      const { profile } = data.metadata

      this.profile = profile

      this.profilePic = this.profile.profile_image
      this.coverPic = this.profile.cover_image
      this.name = this.profile.name
      this.about = this.profile.about
      this.location = this.profile.location
      this.website = this.profile.website
    }

    this.loading = false
  },

  computed: {
    mainchainNodeOptions () {
      const nodes = this.$config.NODES

      return nodes.map((value) => {
        const { origin: text } = new URL(value)

        return {
          text,
          value
        }
      })
    }
  },

  watch: {
    mainchainNode (node, oldValue) {
      this.$cookies.set('mainchain_rpc', node, {
        path: '/',
        maxAge: 10 * 365 * 24 * 60 * 60,
        sameSite: true
      })

      if (oldValue !== '') {
        location.reload()
      }
    },

    nsfwPref (pref) {
      this.$cookies.set('nsfw_pref', pref, {
        path: '/',
        maxAge: 10 * 365 * 24 * 60 * 60,
        sameSite: true
      })
    }
  },

  created () {
    this.mainchainNode = this.$cookies.get('mainchain_rpc') || this.$config.NODES[0]
    this.nsfwPref = this.$cookies.get('nsfw_pref') || 'warn'
  },

  mounted () {
    const self = this

    this.$eventBus.$on('account-update-successful', async () => {
      self.loading = true

      await self.sleep(30 * 1000)

      await self.$fetch()
    })
  },

  beforeDestroy () {
    this.$eventBus.$off('account-update-successful')
  },

  methods: {
    ...mapActions('user', ['uploadFile', 'requestAccountUpdate']),

    async onFileChange (name, files) {
      try {
        const uploadedFile = files[0]

        if (files.length > 0) {
          const size = uploadedFile.size / (1024 * 1024)

          if (size > this.$config.MAX_UPLOAD_SIZE) {
            return this.$notify({
              title: 'Error',
              type: 'error',
              message: `Max file size is ${this.$config.MAX_UPLOAD_SIZE}MB`
            })
          }

          const miniurl = await this.getBase64(uploadedFile)
          uploadedFile.miniurl = miniurl

          const url = await this.uploadFile(uploadedFile)

          this[name] = url
        }
      } catch (e) {
        console.log(e.message)
      }
    },

    getBase64 (file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.readAsDataURL(file)
        reader.onload = () => {
          resolve(reader.result)
        }
        reader.onerror = error => reject(error)
      })
    },

    updateAccount () {
      const profile = {
        ...this.profile,
        profile_image: this.profilePic,
        cover_image: this.coverPic,
        name: this.name,
        about: this.about,
        location: this.location,
        website: this.website
      }

      this.requestAccountUpdate(profile)
    }
  }
}
</script>

<style>

</style>
