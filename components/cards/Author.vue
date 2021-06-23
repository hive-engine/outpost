<template>
  <div class="author-card">
    <div class="d-flex">
      <div>
        <nuxt-link v-slot="{href}" custom class="font-weight-bold" :to="{name:'user', params:{user:author}}">
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
          <b-avatar :src="`${$config.IMAGES_CDN}u/${author}/avatar`" variant="dark" size="75px" class="mr-3" />
        </nuxt-link>

        <div>
          <nuxt-link v-if="profile.name !== ''" class="d-block" :to="{name:'user', params:{user:author}}">
            {{ profile.name }}
          </nuxt-link>

          <nuxt-link :to="{name:'user', params:{user:author}}" class="d-block small text-muted">
            @{{ author }}
          </nuxt-link>

          <b-button v-if="$auth.loggedIn && author !== $auth.user.username" class="mt-1" size="sm" variant="outline-primary" @click.prevent="requestBroadcastFollow({following: author, what: isFollowing ? '': 'blog'})">
            {{ isFollowing ? 'Unfollow' : 'Follow' }}
          </b-button>

          <b-button v-if="$auth.loggedIn && author !== $auth.user.username" class="mt-1" size="sm" variant="outline-primary" @click.prevent="requestBroadcastFollow({following: author, what: 'ignore'})">
            Ignore
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
import { mapGetters, mapActions } from 'vuex'
import vClickOutside from 'v-click-outside'

export default {
  name: 'AuthorCard',

  directives: {
    clickOutside: vClickOutside.directive
  },

  props: {
    author: { type: String, required: true },
    reputation: { type: Number, required: false, default: 0 }
  },

  data () {
    return {
      showAuthorCard: false,
      profile: {
        name: '',
        about: '',
        following: 0,
        followers: 0,
        loaded: false
      }
    }
  },

  computed: {
    ...mapGetters('scot', ['accounts']),
    ...mapGetters('user', ['following']),

    isFollowing () {
      return this.following.includes(this.author)
    }
  },

  watch: {
    async showAuthorCard (shown) {
      if (shown && !this.profile.loaded) {
        const client = this.$chain.getClient()

        const profile = await client.hivemind.call('get_profile', [this.author])
        const { name, about } = profile.metadata.profile
        const { following, followers } = profile.stats

        this.profile = {
          name,
          about,
          following,
          followers,
          loaded: true
        }
      }
    }
  },

  methods: {
    ...mapActions('user', ['requestBroadcastFollow']),

    getReputation (author) {
      const account = this.accounts[author]

      const rep = account ? account.reputation : this.reputation

      return rep.toFixed(0)
    },

    toggleAuthorCard (e) {
      e.preventDefault()

      this.showAuthorCard = !(this.showAuthorCard)
    }
  }
}
</script>

<style>

</style>
