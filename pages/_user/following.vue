<template>
  <div class="user-following">
    <b-container fluid="lg">
      <template v-if="loading">
        <loading />
      </template>

      <template v-else>
        <div class="text-center mt-3 mb-5">
          <b-button-group>
            <b-button variant="outline-primary" :active="$route.name === 'user-followers'" :to="{name:'user-followers', params:{user:$route.params.user}}">
              Followers <b-badge variant="warning">
                {{ followerCount }}
              </b-badge>
            </b-button>
            <b-button variant="outline-primary" :active="$route.name === 'user-following'" :to="{name:'user-following', params:{user:$route.params.user}}">
              Following <b-badge variant="warning">
                {{ followingCount }}
              </b-badge>
            </b-button>
          </b-button-group>
        </div>

        <template v-if="following.length > 0">
          <div v-for="(follower,i) of following" :key="i" class="mt-3 pb-3 border-bottom">
            <b-row>
              <b-col sm="6">
                <div class="d-flex align-items-center">
                  <b-avatar :src="`${$config.IMAGES_CDN}u/${follower.username}/avatar`" variant="dark" size="48px" class="mr-3" />

                  <div class="text-truncate">
                    <div class="d-flex">
                      <div class="mr-2">
                        <template v-if="follower.name !== ''">
                          <nuxt-link :to="{name:'user', params:{user:follower.username}}">
                            {{ follower.name }}
                          </nuxt-link><br>
                        </template>

                        <nuxt-link :class="{'small': follower.name !== ''}" :to="{name:'user', params:{user:follower.username}}">
                          @{{ follower.username }}
                        </nuxt-link>
                      </div>

                      <div>
                        <b-badge variant="info">
                          {{ follower.reputation }}
                        </b-badge>
                      </div>
                    </div>

                    <div class="small text-muted">
                      {{ follower.about }}
                    </div>
                  </div>
                </div>
              </b-col>

              <b-col cols="6" sm="3">
                <div class="small text-muted">
                  {{ $config.TOKEN }} Power
                </div>

                {{ follower.stake }}
              </b-col>

              <b-col cols="6" sm="3" class="text-sm-right">
                <div class="small text-muted">
                  Vote Value
                </div>

                {{ follower.vote_value }}
              </b-col>
            </b-row>
          </div>

          <client-only>
            <infinite-loading :identifier="infiniteId" spinner="waveDots" @infinite="infiniteHandler">
              <div slot="error" slot-scope="{ trigger }">
                Something went wrong! click <a href="javascript:;" @click="trigger">here</a> to retry.
              </div>

              <div slot="no-more" />

              <div slot="no-results" />
            </infinite-loading>
          </client-only>
        </template>

        <b-card v-else class="mt-5">
          @{{ $route.params.user }} doesn't have any follower yet!
        </b-card>
      </template>
    </b-container>
  </div>
</template>

<script>
import { mapGetters, mapActions } from 'vuex'
import InfiniteLoading from 'vue-infinite-loading'
import { calculateReputation } from '@/utils/index'

export default {
  name: 'Following',

  components: {
    InfiniteLoading
  },

  props: {
    followerCount: { type: Number, required: true },
    followingCount: { type: Number, required: true }
  },

  data () {
    return {
      infiniteId: 1,

      following: []
    }
  },

  async fetch () {
    this.loading = true

    const following = await this.requestFetchFollowing()

    this.following.push(...following)

    this.loading = false
  },

  head () {
    return {
      title: 'Followed by'
    }
  },

  computed: {
    ...mapGetters(['tribe_info', 'tribe_config'])
  },

  methods: {
    ...mapActions('user', ['fetchFollowers']),

    async requestFetchFollowing (start = '', limit = 25) {
      const client = this.$chain.getClient()

      const { user } = this.$route.params

      let following = await client.database.call('get_following', [user, start, 'blog', limit])

      following = following.map(d => d.following)

      const [accounts, sidechainBalance] = await Promise.all([
        client.database.getAccounts(following),
        this.$sidechain.getAccountsBalance(following, this.$config.TOKEN)
      ])

      const accountMap = new Map(accounts.map(a => [a.name, a]))

      const stakeMap = new Map(sidechainBalance.map(s => [s.account, Number(s.stake)]))

      return following.reduce((acc, cur) => {
        const stake = stakeMap.get(cur) || 0
        const account = accountMap.get(cur)

        let meta = {}

        try {
          meta = JSON.parse(account.posting_json_metadata)
        } catch {
          //
        }

        acc.push({
          username: cur,
          name: meta.profile && meta.profile.name ? meta.profile.name : '',
          about: meta.profile && meta.profile.about ? meta.profile.about : '',
          reputation: calculateReputation(Number(account.reputation)).toFixed(0),
          stake,
          vote_value: this.calculatedVoteValue(stake)
        })

        return acc
      }, [])
    },

    calculatedVoteValue (balance) {
      if (balance <= 0) {
        return 0
      }

      const vp = 10000
      const stake = balance * 10 ** this.tribe_info.precision

      const rshares = (stake * 100 * vp) / (10000 * 100)

      const value = ((Math.max(0, rshares) ** this.tribe_config.author_curve_exponent) * this.tribe_info.reward_pool) / this.tribe_info.pending_rshares

      return (value / (10 ** this.tribe_info.precision)).toFixed(this.tribe_info.precision)
    },

    async infiniteHandler ($state) {
      const { username: start } = this.following[this.following.length - 1]

      const following = await this.requestFetchFollowing(start)

      if (following.length) {
        this.following.push(...following)

        $state.loaded()
      } else {
        $state.complete()
      }
    }
  }
}
</script>

<style>

</style>
