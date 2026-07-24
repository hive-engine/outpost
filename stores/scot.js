import { defineStore } from 'pinia'
import { calculateReputation, hasNsfwTag, toFixedWithoutRounding } from '@/utils'
import { TOKEN, SCOT_QUERY_LIMIT } from '@/config'
import { useTribeStore } from '~/stores/tribe'

// Identity getters from the Vuex module (communities, accounts, new_results,
// trending_tags) are dropped — Pinia exposes state directly under the same names.
export const useScotStore = defineStore('scot', {
  state: () => ({
    communities: {},
    accounts: {},
    new_results: 0,
    trending_tags: []
  }),

  actions: {
    SET_RESULTS (data) {
      this.new_results = data
    },

    SET_COMMUNITIES (data) {
      const communities = { ...this.communities }

      data.forEach((c) => {
        if (!communities[c.name]) {
          communities[c.name] = c
        }
      })

      this.communities = communities
    },

    SET_ACCOUNTS (data) {
      const accounts = { ...this.accounts }

      data.forEach((c) => {
        if (!accounts[c.name]) {
          // c._reputation = real hivemind display reputation (bridge.get_profile).
          // Fall back to the consensus field only if it's a pre-HF21 raw value;
          // otherwise default to 25 (Hive's baseline) — never show a bogus 0.
          const reputation = (c._reputation != null)
            ? Math.round(Number(c._reputation))
            : (Number(c.reputation) > 0 ? calculateReputation(Number(c.reputation)) : 25)

          accounts[c.name] = { ...c, reputation }
        }
      })

      this.accounts = accounts
    },

    SET_TRENDING_TAGS (data) {
      this.trending_tags = data
    },

    async fetchPosts ({ endpoint, params = {} }) {
      const { $scot, $api } = this.$nuxt
      const config = useRuntimeConfig().public
      const tribeStore = useTribeStore()

      if (endpoint !== 'curated' && !params.limit) {
        params.limit = SCOT_QUERY_LIMIT
      }

      if (['get_feed', 'get_discussions_by_blog'].includes(endpoint)) {
        params.include_reblogs = true
      }

      try {
        let posts = (endpoint === 'curated')
          ? await $api.$get('/api/v1/curated', { params, cache: { ...config.AXIOS_CACHE_CONFIG, ttl: 15 * 60 * 1000 } })
          : await $scot.$get(endpoint, { params, cache: { ...config.AXIOS_CACHE_CONFIG, ttl: 5 * 60 * 1000 } })

        // Some SCOT endpoints (e.g. get_discussions_by_hot) intermittently return a
        // non-array (empty object / error payload); guard so .map doesn't throw.
        if (!Array.isArray(posts)) { posts = [] }

        posts = posts.map((post) => {
          const isPaidout = new Date(`${post.cashout_time}Z`).getTime() < Date.now()

          post.estimated_payout_value = isPaidout
            ? Number(post.total_payout_value)
            : toFixedWithoutRounding(((Number(post.vote_rshares) ** tribeStore.tribe_config.author_curve_exponent) * tribeStore.tribe_info.reward_pool) / tribeStore.tribe_info.pending_rshares, tribeStore.tribe_info.precision)

          post.is_nsfw = hasNsfwTag(post.tags.split(','))

          return post
        })

        const { communities, accounts } = posts.reduce((acc, cur) => {
          if (/^hive-[1-3]\d{4,6}$/.test(cur.parent_permlink) && !this.communities[cur.parent_permlink]) {
            acc.communities.add(cur.parent_permlink)
          }

          if (!this.accounts[cur.author]) {
            acc.accounts.add(cur.author)
          }

          return acc
        }, {
          communities: new Set(),
          accounts: new Set()
        })

        const requests = []

        if (accounts.size > 0) {
          requests.push(this.fetchAccounts(Array.from(accounts)))
        }

        if (communities.size > 0) {
          requests.push(this.fetchCommunities(Array.from(communities)))
        }

        await Promise.all(requests)

        if (posts.length > 0) {
          posts = posts.reduce((acc, cur) => {
            cur.active_votes = cur.active_votes.map(v => ({ ...v, rshares: Number(v.rshares) }))
            cur.vote_rshares = Number(cur.vote_rshares)
            cur.total_payout_value = Number(cur.total_payout_value)

            acc.push(cur)

            return acc
          }, [])
        }

        return posts
      } catch (e) {
        console.log(e)
      }
    },

    async fetchPost ({ author, permlink }) {
      const { $scot } = this.$nuxt
      const tribeStore = useTribeStore()

      let post = {}

      try {
        const data = await $scot.$get(`@${author}/${permlink}`)
        post = data[TOKEN]

        const isPaidout = new Date(`${post.cashout_time}Z`).getTime() < Date.now()

        post.active_votes = post.active_votes.map(v => ({ ...v, rshares: Number(v.rshares) }))
        post.vote_rshares = Number(post.vote_rshares)
        post.total_payout_value = Number(post.total_payout_value)

        post.estimated_payout_value = isPaidout
          ? post.total_payout_value
          : toFixedWithoutRounding(((Number(post.vote_rshares) ** tribeStore.tribe_config.author_curve_exponent) * tribeStore.tribe_info.reward_pool) / tribeStore.tribe_info.pending_rshares, tribeStore.tribe_info.precision)

        post.is_nsfw = hasNsfwTag(post.tags.split(','))
      } catch {
        //
      }

      return post
    },

    async fetchThread ({ author, permlink }) {
      const { $scot } = this.$nuxt
      const tribeStore = useTribeStore()

      let posts = []

      try {
        const thread = await $scot.$get('get_thread', { params: { author, permlink } })

        posts = thread.map((post) => {
          const isPaidout = new Date(`${post.cashout_time}Z`).getTime() < Date.now()

          post.active_votes = post.active_votes.map(v => ({ ...v, rshares: Number(v.rshares) }))
          post.vote_rshares = Number(post.vote_rshares)
          post.total_payout_value = Number(post.total_payout_value)

          post.estimated_payout_value = isPaidout
            ? post.total_payout_value
            : toFixedWithoutRounding(((Number(post.vote_rshares) ** tribeStore.tribe_config.author_curve_exponent) * tribeStore.tribe_info.reward_pool) / tribeStore.tribe_info.pending_rshares, tribeStore.tribe_info.precision)

          return post
        })
      } catch {
        //
      }

      return posts
    },

    async fetchTrendingTags () {
      const { $scot } = this.$nuxt

      try {
        const tags = await $scot.$get('get_trending_tags')

        this.SET_TRENDING_TAGS(tags)
      } catch {
        //
      }
    },

    async fetchCommunities (communities) {
      const { $chain } = this.$nuxt

      try {
        const client = $chain.getClient()

        const requests = communities.map(c => client.hivemind.getCommunity({ name: c }))

        const data = await Promise.all(requests)

        this.SET_COMMUNITIES(data)
      } catch {
        //
      }
    },

    async fetchAccounts (accounts) {
      const { $chain } = this.$nuxt

      try {
        const client = $chain.getClient()

        // Reputation was moved from blockchain consensus to hivemind (HF21), so
        // database.getAccounts().reputation is 0 for everyone now. Fetch the real
        // display reputation from hivemind (bridge.get_profile) in parallel.
        const [data, profiles] = await Promise.all([
          client.database.getAccounts(accounts),
          Promise.all(accounts.map(a => client.hivemind.call('get_profile', { account: a }).catch(() => null)))
        ])

        const repByName = {}
        accounts.forEach((name, i) => {
          if (profiles[i] && profiles[i].reputation != null) { repByName[name] = profiles[i].reputation }
        })

        data.forEach((d) => { if (repByName[d.name] != null) { d._reputation = repByName[d.name] } })

        this.SET_ACCOUNTS(data)
      } catch {
        //
      }
    }
  }
})
