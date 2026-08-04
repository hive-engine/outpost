<template>
  <div class="profile">
    <div v-if="!isPostView" class="profile-cover" :style="backgroundOverlay">
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
                <div class="me-3">
                  <nuxt-link :to="{name:'user-followers'}">
                    <fa-icon icon="users" /> {{ followerCount }} Followers
                  </nuxt-link>
                </div>
                <div class="me-3">
                  <nuxt-link :to="{name:'user-following'}">
                    <fa-icon icon="users" /> {{ followingCount }}  Following
                  </nuxt-link>
                </div>
                <div v-if="profile.website && userWebsite.href" class="me-3">
                  <fa-icon icon="link" /> <a :href="`${userWebsite.href}`" target="_blank">{{ userWebsite.host }}</a>
                </div>
                <div v-if="profile.location">
                  <fa-icon icon="map-marked-alt" /> {{ profile.location }}
                </div>
              </div>

              <div v-if="profile.about" class="mt-2">
                {{ profile.about }}
              </div>

              <div v-if="badges.length" class="profile-badges mt-2">
                <span v-for="(b, i) in badges" :key="i" class="profile-badge" :title="b.title">{{ b.emoji }} {{ b.label }}</span>
              </div>
            </b-media>
          </b-col>

          <b-col v-if="auth.loggedIn && $route.params.user !== auth.user.username" md="4" lg="2" class="text-center text-md-end">
            <b-button size="sm" class="mt-2" variant="primary" @click.prevent="requestBroadcastFollow({following: $route.params.user, what: isFollowing ? '': 'blog'})">
              {{ isFollowing ? 'Unfollow' : 'Follow' }}
            </b-button>

            <b-button size="sm" class="mt-2" variant="warning" @click.prevent="requestBroadcastFollow({following: $route.params.user, what: 'ignore'})">
              Ignore
            </b-button>

            <b-button v-if="auth.user.username === muting_account" size="sm" class="mt-2" variant="primary" @click.prevent="requestBroadcastMute({ account:$route.params.user, mute: !muted})">
              {{ muted? 'Unmute': 'Mute' }}
            </b-button>
          </b-col>
        </b-row>
      </b-container>
    </div>

    <b-nav v-if="!isPostView" align="center" pills class="profile-tabs">
      <template v-for="(route, i) of childRoutes">
        <b-nav-item v-if="route.show" :key="i" :to="{name: route.name, params: {user: $route.params.user}}" :active="route.name === $route.name || (route.name === 'user-followers' && $route.name === 'user-following')">
          {{ route.title }}<span v-if="route.name === 'user-mentions' && ownProfile && notif.unreadByType.mention" class="tab-badge">{{ notif.unreadByType.mention > 99 ? '99+' : notif.unreadByType.mention }}</span>
        </b-nav-item>
      </template>
    </b-nav>

    <NuxtPage :page-key="route => route.fullPath" :follower-count="followerCount" :following-count="followingCount" />
  </div>
</template>

<script>
// Ported from legacy/pages/_user.vue — the profile PARENT wrapper.
// Nuxt 2 <nuxt-child> -> Nuxt 3 <NuxtPage> (children live in pages/@[user]/*).
// asyncData({ $chain, $sidechain, route, error }) -> async setup() + useAsyncData;
// error({statusCode:404}) -> throw createError(...); head() -> useHead().
// Vuex: root getter muting_account -> useTribeStore; user/following -> useUserStore;
// user actions -> mapActions(useUserStore). $auth -> auth, $config -> config (setup()).
// $fetch() re-run -> useAsyncData refresh(). BS5: mr-3 -> me-3, text-md-right -> text-md-end.
import { mapState, mapActions } from 'pinia'
import { useAuthStore } from '~/stores/auth'
import { useTribeStore } from '~/stores/tribe'
import { useUserStore } from '~/stores/user'
import { useNotificationsStore } from '~/stores/notifications'

export default {
  name: 'UserProfileMain',

  async setup () {
    const config = useRuntimeConfig().public
    const auth = useAuthStore()
    const notif = useNotificationsStore()
    const route = useRoute()
    const { $chain, $sidechain } = useNuxtApp()

    const { data, refresh } = await useAsyncData(`profile-${route.params.user}`, async () => {
      let account
      let profile = {}
      let muted = false
      let followerCount = 0
      let followingCount = 0
      let bbhoStake = 0
      let backgroundOverlay = 'background-image: linear-gradient(rgba(0, 0, 0, 0.2) 0%, rgba(0, 0, 0, 0.2) 40%, rgba(10, 10, 10, 0.75) 100%)'

      const client = $chain.getClient()

      try {
        const [[userAccount], followCount, heVotingPower, bbhoBalance] = await Promise.all([
          client.database.getAccounts([route.params.user]),
          client.database.call('get_follow_count', [route.params.user]),
          $sidechain.getVotingPower(route.params.user),
          $sidechain.getBalance(route.params.user, config.TOKEN).catch(() => null)
        ])

        if (userAccount) { account = userAccount }

        muted = heVotingPower ? heVotingPower.mute : false

        followerCount = followCount.follower_count
        followingCount = followCount.following_count
        bbhoStake = bbhoBalance ? (Number(bbhoBalance.stake) || 0) : 0
      } catch (e) {
        //
      }

      if (!account) {
        throw createError({ statusCode: 404, statusMessage: 'Unknown user account!' })
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

      return { account, profile, muted, followerCount, followingCount, bbhoStake, backgroundOverlay }
    })

    const muted = ref(data.value?.muted ?? false)

    // Keep local (mutable) muted in sync when the profile is refetched.
    watch(data, (d) => { if (d) { muted.value = d.muted } })

    useHead(() => {
      const acc = data.value?.account || {}
      const prof = data.value?.profile || {}
      const title = prof.name ? `${prof.name} (@${acc.name})` : acc.name

      return {
        titleTemplate: titleChunk => (titleChunk ? `${titleChunk} ${title} - ${config.APP_TITLE}` : `${title} - ${config.APP_TITLE}`)
      }
    })

    return { config, auth, notif, data, refresh, muted }
  },

  data () {
    return {
      loading: false
    }
  },

  computed: {
    ...mapState(useTribeStore, ['muting_account']),
    ...mapState(useUserStore, ['following']),

    // Viewing your own profile — the unread mentions badge only makes sense there.
    ownProfile () {
      return this.auth.loggedIn && this.$route.params.user === this.auth.user.username
    },

    // A single post (/@user/:post) is nested under this profile wrapper by Nuxt file
    // routing, but should render standalone — hide the profile cover + tab nav for it.
    isPostView () {
      return this.$route.name === 'user-post'
    },

    account () {
      return this.data?.account || {}
    },

    profile () {
      return this.data?.profile || {}
    },

    // Achievement badges derived from account age, post count & BBHO stake.
    badges () {
      const acc = this.data?.account
      if (!acc) { return [] }

      const out = []
      const created = new Date(`${acc.created}Z`)
      const years = (Date.now() - created.getTime()) / (365.25 * 24 * 3600 * 1000)

      out.push({ emoji: '📅', label: `Hive since ${created.getFullYear()}`, title: 'Account creation year' })

      if (years >= 5) { out.push({ emoji: '👑', label: 'OG', title: '5+ years on Hive' }) }
      else if (years >= 3) { out.push({ emoji: '🏅', label: 'Veteran', title: '3+ years on Hive' }) }
      else if (years >= 1) { out.push({ emoji: '⭐', label: 'Established', title: '1+ year on Hive' }) }
      else { out.push({ emoji: '🌱', label: 'Newcomer', title: 'On Hive under a year' }) }

      const posts = Number(acc.post_count) || 0
      out.push({ emoji: '📝', label: `${this.compact(posts)} posts`, title: `${posts.toLocaleString()} posts & comments` })
      if (posts >= 5000) { out.push({ emoji: '✍️', label: 'Prolific', title: '5,000+ posts & comments' }) }

      const stake = Number(this.data?.bbhoStake) || 0
      if (stake >= 100000) { out.push({ emoji: '🐋', label: 'BBHO Whale', title: `${this.compact(stake)} ${this.config.TOKEN} staked` }) }
      else if (stake >= 25000) { out.push({ emoji: '🦈', label: 'BBHO Shark', title: `${this.compact(stake)} ${this.config.TOKEN} staked` }) }
      else if (stake >= 5000) { out.push({ emoji: '🐬', label: 'BBHO Dolphin', title: `${this.compact(stake)} ${this.config.TOKEN} staked` }) }
      else if (stake >= 1000) { out.push({ emoji: '🐟', label: 'BBHO Minnow', title: `${this.compact(stake)} ${this.config.TOKEN} staked` }) }

      return out
    },

    followerCount () {
      return this.data?.followerCount || 0
    },

    followingCount () {
      return this.data?.followingCount || 0
    },

    backgroundOverlay () {
      return this.data?.backgroundOverlay || ''
    },

    childRoutes () {
      return [
        { name: 'user', title: 'Blog', show: true },
        { name: 'user-posts', title: 'Posts', show: true },
        { name: 'user-comments', title: 'Comments', show: true },
        { name: 'user-replies', title: 'Replies', show: true },
        { name: 'user-mentions', title: 'Mentions', show: true },
        { name: 'user-followers', title: 'Connections', show: true },
        { name: 'user-wallet', title: 'Wallet', show: true },
        { name: 'user-settings', title: 'Settings', show: this.auth.loggedIn && this.$route.params.user === this.auth.user.username }
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

      await self.refresh()

      self.loading = false
    })

    this.$eventBus.$on('user-mute-successful', this.onMute)
  },

  beforeUnmount () {
    this.$eventBus.$off('account-update-successful')
    this.$eventBus.$off('user-mute-successful', this.onMute)
  },

  methods: {
    ...mapActions(useUserStore, ['requestBroadcastFollow', 'requestBroadcastMute']),

    compact (n) {
      n = Number(n) || 0
      if (n >= 1e6) { return `${(n / 1e6).toFixed(1)}M` }
      if (n >= 1e3) { return `${(n / 1e3).toFixed(1)}K` }
      return String(Math.round(n))
    },

    sleep (ms) {
      return new Promise(resolve => setTimeout(resolve, ms))
    },

    onMute ({ account, mute }) {
      if (this.$route.params.user === account) {
        this.muted = mute
      }
    }
  }
}
</script>

<style scoped>
.profile-badges { display: flex; flex-wrap: wrap; gap: .4rem; }
.profile-badge {
  font-size: .74rem; font-weight: 700; line-height: 1.2;
  padding: .22rem .62rem; border-radius: 999px;
  background: rgba(255, 255, 255, .12); color: #fff;
  border: 1px solid rgba(255, 255, 255, .18);
  backdrop-filter: blur(4px); white-space: nowrap;
}
.profile-cover {
  min-height: 240px;
  display: flex;
  align-items: flex-end;
  padding: 2rem 0 1.6rem;
  background-size: cover;
  background-position: center;
  color: #fff;
  position: relative;
  z-index: 1;
}
.profile-cover :deep(h4) { font-size: 1.8rem; font-weight: 700; margin: 0; text-shadow: 0 2px 12px rgba(0,0,0,.6); }
.profile-cover :deep(a) { color: #ffe08a !important; text-decoration: none; }
.profile-cover :deep(a:hover) { color: #fff !important; }
.profile-cover :deep(.b-avatar) { border: 3px solid var(--w3-gold); box-shadow: 0 4px 20px rgba(0,0,0,.5); }

/* tab bar — dark glass pills (replaces the white bg-light band) */
.profile-tabs {
  position: relative;
  z-index: 2;
  gap: .3rem;
  padding: .7rem clamp(1rem, 4vw, 2rem);
  background: rgba(8,8,12,.85) !important;
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--w3-border);
  margin-bottom: 1.5rem;
}
.profile-tabs :deep(.nav-link) {
  color: var(--w3-muted) !important;
  font-weight: 600;
  border-radius: 999px;
  padding: .45rem 1.1rem;
}
.profile-tabs :deep(.nav-link:hover) { color: var(--w3-text) !important; background: var(--w3-panel-2); }
.profile-tabs :deep(.nav-link.active) {
  color: #1a1206 !important;
  background: linear-gradient(135deg, var(--w3-gold), #ffd34d) !important;
  box-shadow: 0 0 18px rgba(245,184,0,.3);
}
.tab-badge {
  display: inline-block; margin-left: .4rem; padding: .05rem .34rem;
  background: var(--w3-red, #ff5964); color: #fff; font-size: .68rem; font-weight: 800;
  line-height: 1.3; border-radius: 999px; vertical-align: middle;
}
.profile-tabs :deep(.nav-link.active) .tab-badge { background: rgba(26,18,6,.8); color: #ffd34d; }
</style>
