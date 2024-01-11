<template>
  <div class="profile">
    <div class="profile-cover" :style="backgroundOverlay">
      <b-container fluid="lg">
        <b-row no-gutters>
          <b-col md="8" lg="10">
            <b-media>
              <template #aside>
                <b-avatar :src="`https://images.hive.blog/u/${$route.params.user}/avatar`" variant="dark" size="96px" />
              </template>

              <h4>
                {{ profile.name || account.name }}
              </h4>

              <div class="d-flex flex-wrap mt-2">
                <div class="mr-3">
                  <nuxt-link :to="{name:'user-followers'}">
                    <fa-icon icon="users" /> {{ followerCount }} Followers
                  </nuxt-link>
                </div>
                <div class="mr-3">
                  <nuxt-link :to="{name:'user-following'}">
                    <fa-icon icon="users" /> {{ followingCount }}  Following
                  </nuxt-link>
                </div>
                <div v-if="profile.website && userWebsite.href" class="mr-3">
                  <fa-icon icon="link" /> <a :href="`${userWebsite.href}`" target="_blank">{{ userWebsite.host }}</a>
                </div>
                <div v-if="profile.location">
                  <fa-icon icon="map-marked-alt" /> {{ profile.location }}
                </div>
              </div>

              <div v-if="profile.about" class="mt-2">
                {{ profile.about }}
              </div>
            </b-media>
          </b-col>

          <b-col v-if="$auth.loggedIn && $route.params.user !== $auth.user.username" md="4" lg="2" class="text-center text-md-right">
            <b-button size="sm" class="mt-2" variant="primary" @click.prevent="requestBroadcastFollow({following: $route.params.user, what: isFollowing ? '': 'blog'})">
              {{ isFollowing ? 'Unfollow' : 'Follow' }}
            </b-button>

            <b-button size="sm" class="mt-2" variant="warning" @click.prevent="requestBroadcastFollow({following: $route.params.user, what: 'ignore'})">
              Ignore
            </b-button>

            <b-button v-if="$auth.user.username === muting_account" size="sm" class="mt-2" variant="primary" @click.prevent="requestBroadcastMute({ account:$route.params.user, mute: !muted})">
              {{ muted? 'Unmute': 'Mute' }}
            </b-button>
          </b-col>
        </b-row>
      </b-container>
    </div>

    <b-nav align="center" pills class="bg-light">
      <template v-for="(route, i) of childRoutes">
        <b-nav-item v-if="route.show" :key="i" :to="{name: route.name, params: {user: $route.params.user}}" :active="route.name === $route.name || (route.name === 'user-followers' && $route.name === 'user-following')">
          {{ route.title }}
        </b-nav-item>
      </template>
    </b-nav>

    <nuxt-child :key="$route.fullPath" :follower-count="followerCount" :following-count="followingCount" />
  </div>
</template>

<script>
import { mapGetters, mapActions } from 'vuex'

export default {
  name: 'UserProfileMain',

  async asyncData ({ $chain, $sidechain, route, error }) {
    let account
    let profile = {}
    let muted
    let followerCount
    let followingCount
    let backgroundOverlay = 'background-image: linear-gradient(rgba(0, 0, 0, 0.2) 0%, rgba(0, 0, 0, 0.2) 40%, rgba(10, 10, 10, 0.75) 100%)'

    const client = $chain.getClient()

    try {
      const [[userAccount], followCount, heVotingPower] = await Promise.all([
        client.database.getAccounts([route.params.user]),
        client.database.call('get_follow_count', [route.params.user]),
        $sidechain.getVotingPower(route.params.user)
      ])

      if (userAccount) { account = userAccount }

      muted = heVotingPower ? heVotingPower.mute : false

      followerCount = followCount.follower_count
      followingCount = followCount.following_count
    } catch (e) {
    //
    }

    if (!account) {
      return error({ statusCode: 404, message: 'Unknown user account!' })
    }

    try {
      account.posting_json_metadata = JSON.parse(account.posting_json_metadata)

      if (account.posting_json_metadata.profile) {
        profile = account.posting_json_metadata.profile

        if (profile.cover_image) {
          backgroundOverlay = `${backgroundOverlay}, url('${profile.cover_image}')`
        }
      }
    } catch {
      //
    }

    return {
      account,
      profile,
      muted,
      followerCount,
      followingCount,
      backgroundOverlay
    }
  },

  head () {
    const title = this.profile.name ? `${this.profile.name} (@${this.account.name})` : this.account.name

    return {
      titleTemplate: (titleChunk) => {
        return titleChunk ? `${titleChunk} ${title} - ${this.$config.APP_TITLE}` : `${title} - ${this.$config.APP_TITLE}`
      }
    }
  },

  computed: {
    ...mapGetters(['muting_account']),
    ...mapGetters('user', ['following']),

    childRoutes () {
      return [
        { name: 'user', title: 'Blog', show: true },
        { name: 'user-scheduledposts', title: 'Scheduled posts', show: true },
        { name: 'user-comments', title: 'Comments', show: true },
        { name: 'user-replies', title: 'Replies', show: true },
        { name: 'user-followers', title: 'Connections', show: true },
        { name: 'user-wallet', title: 'Wallet', show: true },
        { name: 'user-settings', title: 'Settings', show: this.$auth.loggedIn && this.$route.params.user === this.$auth.user.username }
      ]
    },

    isFollowing () {
      return this.following.includes(this.$route.params.user)
    },

    userWebsite () {
      let host
      let href

      if (this.profile && this.profile.website) {
        try {
          const url = new URL(this.profile.website)

          host = url.host
          href = url.href
        } catch {

        }
      }

      return {
        host,
        href
      }
    }
  },

  mounted () {
    const self = this

    this.$eventBus.$on('account-update-successful', async () => {
      self.loading = true

      await self.sleep(30 * 1000)

      await self.$fetch()
    })

    this.$eventBus.$on('user-mute-successful', this.onMute)
  },

  beforeDestroy () {
    this.$eventBus.$off('account-update-successful')
    this.$eventBus.$off('user-mute-successful', this.onMute)
  },

  methods: {
    ...mapActions('user', ['requestBroadcastFollow', 'requestBroadcastMute']),

    onMute ({ account, mute }) {
      if (this.$route.params.user === account) {
        this.muted = mute
      }
    }
  }
}
</script>

<style>

</style>
