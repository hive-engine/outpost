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

        <b-button variant="primary" :disabled="!auth.loggedIn" @click.prevent="updateAccount">
          Update
        </b-button>

        <b-row class="mt-5">
          <b-col sm="6" md="4">
            <b-form-group :label="`${config.IS_HIVE ? 'Hive':'Steem'} RPC Node`">
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
// Ported from legacy/pages/_user/settings.vue (route name 'user-settings').
// middleware:'authenticated' -> definePageMeta; fetch() -> async setup() + useAsyncData;
// $cookies.get/set -> useCookie; $config -> config, $auth -> auth (setup);
// Vuex user actions -> mapActions(useUserStore); $chain/$notify stay this.$x.
import { mapActions } from 'pinia'
import { useAuthStore } from '~/stores/auth'
import { useUserStore } from '~/stores/user'

const COOKIE_OPTS = { path: '/', maxAge: 10 * 365 * 24 * 60 * 60, sameSite: true }

export default {
  name: 'Settings',

  async setup () {
    definePageMeta({ name: 'user-settings', middleware: 'authenticated' })

    const config = useRuntimeConfig().public
    const auth = useAuthStore()
    const { $chain } = useNuxtApp()

    const mainchainCookie = useCookie('mainchain_rpc', COOKIE_OPTS)
    const nsfwCookie = useCookie('nsfw_pref', COOKIE_OPTS)

    const { data: initialProfile } = await useAsyncData(`settings-${auth.user?.username}`, async () => {
      const data = await $chain.client.hivemind.call('get_profile', { account: auth.user.username })

      if (data && data.metadata && data.metadata.profile) {
        return data.metadata.profile
      }

      return {}
    })

    return { config, auth, mainchainCookie, nsfwCookie, initialProfile }
  },

  data () {
    return {
      loading: false,

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

  computed: {
    mainchainNodeOptions () {
      const nodes = this.config.NODES

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
      this.mainchainCookie.value = node

      if (oldValue !== '') {
        location.reload()
      }
    },

    nsfwPref (pref) {
      this.nsfwCookie.value = pref
    }
  },

  created () {
    // Seed form fields from the profile fetched in setup().
    const profile = this.initialProfile || {}

    this.profile = profile
    this.profilePic = profile.profile_image
    this.coverPic = profile.cover_image
    this.name = profile.name
    this.about = profile.about
    this.location = profile.location
    this.website = profile.website

    this.mainchainNode = this.mainchainCookie.value || this.config.NODES[0]
    this.nsfwPref = this.nsfwCookie.value || 'warn'
  },

  mounted () {
    const self = this

    this.$eventBus.$on('account-update-successful', async () => {
      self.loading = true

      await self.sleep(30 * 1000)

      await self.refresh()

      self.loading = false
    })
  },

  beforeUnmount () {
    this.$eventBus.$off('account-update-successful')
  },

  methods: {
    ...mapActions(useUserStore, ['uploadFile', 'requestAccountUpdate']),

    sleep (ms) {
      return new Promise(resolve => setTimeout(resolve, ms))
    },

    async refresh () {
      const data = await this.$chain.client.hivemind.call('get_profile', { account: this.auth.user.username })

      if (data && data.metadata && data.metadata.profile) {
        const { profile } = data.metadata

        this.profile = profile
        this.profilePic = profile.profile_image
        this.coverPic = profile.cover_image
        this.name = profile.name
        this.about = profile.about
        this.location = profile.location
        this.website = profile.website
      }
    },

    async onFileChange (name, files) {
      try {
        const uploadedFile = files[0]

        if (files.length > 0) {
          const size = uploadedFile.size / (1024 * 1024)

          if (size > this.config.MAX_UPLOAD_SIZE) {
            return this.$notify({
              title: 'Error',
              type: 'error',
              message: `Max file size is ${this.config.MAX_UPLOAD_SIZE}MB`
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
