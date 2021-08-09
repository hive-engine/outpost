import { calculateReputation, toFixedWithoutRounding } from '@/utils'
import { TOKEN, SCOT_QUERY_LIMIT } from '@/config'

export const state = () => {
  return {
    communities: {},
    accounts: {},
    new_results: 0,
    trending_tags: []
  }
}

export const getters = {
  communities: state => state.communities,
  accounts: state => state.accounts,
  new_results: state => state.new_results,
  trending_tags: state => state.trending_tags
}

export const mutations = {
  SET_RESULTS (state, data) {
    state.new_results = data
  },

  SET_COMMUNITIES (state, data) {
    const communities = { ...state.communities }

    data.forEach((c) => {
      if (!communities[c.name]) {
        communities[c.name] = c
      }
    })

    state.communities = communities
  },

  SET_ACCOUNTS (state, data) {
    const accounts = { ...state.accounts }

    data.forEach((c) => {
      if (!accounts[c.name]) {
        accounts[c.name] = { ...c, reputation: calculateReputation(Number(c.reputation)) }
      }
    })

    state.accounts = accounts
  },

  SET_TRENDING_TAGS (state, data) {
    state.trending_tags = data
  }
}

export const actions = {
  async fetchPosts ({ state, dispatch, rootState }, { endpoint, params = {} }) {
    if (endpoint !== 'curated' && !params.limit) {
      params.limit = SCOT_QUERY_LIMIT
    }

    try {
      const posts = (endpoint === 'curated')
        ? await this.$axios.$get('/api/v1/curated', { params, cache: { ...this.$config.AXIOS_CACHE_CONFIG, maxAge: 15 * 60 * 1000 } })
        : await this.$scot.$get(endpoint, { params, cache: { ...this.$config.AXIOS_CACHE_CONFIG, maxAge: 5 * 60 * 1000 } })

      const { communities, accounts } = posts.reduce((acc, cur) => {
        if (/^hive-[1-3]\d{4,6}$/.test(cur.parent_permlink) && !state.communities[cur.parent_permlink]) {
          acc.communities.add(cur.parent_permlink)
        }

        if (!state.accounts[cur.author]) {
          acc.accounts.add(cur.author)
        }

        const isPaidout = new Date(`${cur.cashout_time}Z`).getTime() < Date.now()

        cur.estimated_payout_value = isPaidout
          ? cur.total_payout_value
          : toFixedWithoutRounding(((cur.vote_rshares ** rootState.tribe_config.author_curve_exponent) * rootState.tribe_info.reward_pool) / rootState.tribe_info.pending_rshares, rootState.tribe_info.precision)

        return acc
      }, {
        communities: new Set(),
        accounts: new Set()
      })

      const requests = []

      if (accounts.size > 0) {
        requests.push(dispatch('fetchAccounts', Array.from(accounts)))
      }

      if (communities.size > 0) {
        requests.push(dispatch('fetchCommunities', Array.from(communities)))
      }

      await Promise.all(requests)

      return posts
    } catch (e) {
      console.log(e)
    }
  },

  async fetchPost ({ rootState }, { author, permlink }) {
    let post = {}

    try {
      const data = await this.$scot.$get(`@${author}/${permlink}`)
      post = data[TOKEN]

      const isPaidout = new Date(`${post.cashout_time}Z`).getTime() < Date.now()

      post.estimated_payout_value = isPaidout
        ? post.total_payout_value
        : toFixedWithoutRounding(((post.vote_rshares ** rootState.tribe_config.author_curve_exponent) * rootState.tribe_info.reward_pool) / rootState.tribe_info.pending_rshares, rootState.tribe_info.precision)
    } catch {
      //
    }

    return post
  },

  async fetchThread ({ rootState }, { author, permlink }) {
    let posts = []

    try {
      const thread = await this.$scot.$get('get_thread', { params: { author, permlink } })

      posts = thread.map((post) => {
        const isPaidout = new Date(`${post.cashout_time}Z`).getTime() < Date.now()

        post.estimated_payout_value = isPaidout
          ? post.total_payout_value
          : toFixedWithoutRounding(((post.vote_rshares ** rootState.tribe_config.author_curve_exponent) * rootState.tribe_info.reward_pool) / rootState.tribe_info.pending_rshares, rootState.tribe_info.precision)

        return post
      })
    } catch {
      //
    }

    return posts
  },

  async fetchTrendingTags ({ commit }) {
    try {
      const tags = await this.$scot.$get('get_trending_tags')

      commit('SET_TRENDING_TAGS', tags)
    } catch {
      //
    }
  },

  async fetchCommunities ({ commit }, communities) {
    try {
      const client = this.$chain.getClient()

      const requests = communities.map(c => client.hivemind.getCommunity({ name: c }))

      const data = await Promise.all(requests)

      commit('SET_COMMUNITIES', data)
    } catch {
      //
    }
  },

  async fetchAccounts ({ commit }, accounts) {
    try {
      const data = await this.$chain.getClient().database.getAccounts(accounts)

      commit('SET_ACCOUNTS', data)
    } catch {
      //
    }
  }
}
