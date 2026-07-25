<template>
  <div class="author-card">
    <div class="d-flex">
      <div>
        <nuxt-link v-slot="{href}" custom class="fw-bold" :to="{name:'user', params:{user:author}}">
          <a :href="href" @click="toggleAuthorCard($event)">
            @{{ author }} <fa-icon class="pt-1" icon="angle-down" />
          </a>
        </nuxt-link>

        <b-badge variant="info" class="p2">
          {{ getReputation(author) }}
        </b-badge>
      </div>
    </div>

    <div v-if="showAuthorCard" v-click-outside="() => showAuthorCard = !(showAuthorCard)" class="author-dropdown">
      <div class="d-flex">
        <nuxt-link :to="{name:'user', params:{user:author}}">
          <b-avatar :src="`${config.IMAGES_CDN}u/${author}/avatar`" variant="dark" size="75px" class="me-3" />
        </nuxt-link>

        <div>
          <nuxt-link v-if="profile.name !== ''" class="d-block" :to="{name:'user', params:{user:author}}">
            {{ profile.name }}
          </nuxt-link>

          <nuxt-link :to="{name:'user', params:{user:author}}" class="d-block small text-muted">
            @{{ author }}
          </nuxt-link>

          <b-button v-if="auth.loggedIn && author !== auth.user.username" class="mt-1" size="sm" variant="outline-primary" @click.prevent="requestBroadcastFollow({following: author, what: isFollowing ? '': 'blog'})">
            {{ isFollowing ? 'Unfollow' : 'Follow' }}
          </b-button>

          <b-button v-if="auth.loggedIn && author !== auth.user.username" class="mt-1" size="sm" variant="outline-primary" @click.prevent="requestBroadcastFollow({following: author, what: 'ignore'})">
            Ignore
          </b-button>

          <b-button v-if="auth.loggedIn && auth.user.username === muting_account" class="mt-1" size="sm" variant="outline-primary" @click.prevent="requestBroadcastMute({account: author, mute: !profile.muted})">
            {{ profile.muted ? 'Unmute': 'Mute' }}
          </b-button>
        </div>
      </div>

      <div class="d-flex text-center small mt-2">
        <div class="px-1">
          {{ profile.following }}<br>
          Following
        </div>
        <div class="px-1">
          {{ profile.followers }}<br>
          Followers
        </div>
      </div>

      <div v-if="profile.about !== ''" class="mt-1 px-1 small text-muted">
        {{ profile.about }}
      </div>
    </div>
  </div>
</template>

<script>
// Ported from legacy/components/cards/Author.vue.
// - v-click-outside (Vue-2-only package, not in the new deps) → small local
//   directive with identical semantics (document click outside el fires binding).
// - Vuex: root muting_account → useTribeStore, scot accounts → useScotStore,
//   user following/actions → useUserStore.
// - $config/$auth → setup() runtime config + auth store; $chain/$sidechain/$eventBus
//   unchanged (Nuxt 3 plugin provides expose them on `this`).
// - BS5: font-weight-bold → fw-bold, mr-3 → me-3.
import { mapState, mapActions } from 'pinia'
import { calculateReputation } from '~/utils'
import { useAuthStore } from '~/stores/auth'
import { useTribeStore } from '~/stores/tribe'
import { useScotStore } from '~/stores/scot'
import { useUserStore } from '~/stores/user'

export default {
  name: 'AuthorCard',

  directives: {
    clickOutside: {
      beforeMount (el, binding) {
        el.__clickOutsideHandler__ = (event) => {
          if (el !== event.target && !el.contains(event.target)) {
            binding.value(event)
          }
        }
        document.addEventListener('click', el.__clickOutsideHandler__)
      },
      unmounted (el) {
        document.removeEventListener('click', el.__clickOutsideHandler__)
        delete el.__clickOutsideHandler__
      }
    }
  },

  props: {
    author: { type: String, required: true },
    reputation: { type: Number, required: false, default: 0 }
  },

  setup () {
    const config = useRuntimeConfig().public
    const auth = useAuthStore()

    return { config, auth }
  },

  data () {
    return {
      showAuthorCard: false,
      profile: {
        name: '',
        about: '',
        following: 0,
        followers: 0,
        muted: false,
        loaded: false
      }
    }
  },

  computed: {
    ...mapState(useTribeStore, ['muting_account']),
    ...mapState(useScotStore, ['accounts']),
    ...mapState(useUserStore, ['following']),

    isFollowing () {
      return this.following.includes(this.author)
    }
  },

  watch: {
    async showAuthorCard (shown) {
      if (shown && !this.profile.loaded) {
        try {
          const client = this.$chain.getClient()

          const [profile, heVotingPower] = await Promise.all([
            client.hivemind.call('get_profile', [this.author]),
            this.$sidechain.getVotingPower(this.author)
          ])

          const { name, about } = profile.metadata.profile
          const { following, followers } = profile.stats

          this.profile = {
            name,
            about,
            following,
            followers,
            muted: heVotingPower ? heVotingPower.mute : false,
            loaded: true
          }
        } catch {
          //
        }
      }
    }
  },

  mounted () {
    this.$eventBus.$on('user-mute-successful', this.onMute)
  },

  beforeUnmount () {
    this.$eventBus.$off('user-mute-successful', this.onMute)
  },

  methods: {
    ...mapActions(useUserStore, ['requestBroadcastFollow', 'requestBroadcastMute']),

    getReputation (author) {
      const account = this.accounts[author]

      const rep = account ? account.reputation : this.reputation
      const n = Number(rep)

      if (!Number.isFinite(n) || n === 0) { return 25 }

      // Handle either a raw blockchain reputation (huge) or an already-computed
      // hivemind display value (small).
      return Math.abs(n) > 1e6 ? calculateReputation(n) : Math.round(n)
    },

    toggleAuthorCard (e) {
      e.preventDefault()

      this.showAuthorCard = !(this.showAuthorCard)
    },

    onMute ({ account, mute }) {
      if (this.author === account) {
        this.profile.muted = mute
      }
    }
  }
}
</script>
