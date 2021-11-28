import { toFixedWithoutRounding } from '@/utils'
import { decrypt as WCDecrypt } from '@/utils/web-crypto'

export const state = () => {
  return {
    smartlock: false,
    scot_data: {},
    profiles: {},
    followers: [],
    following: []
  }
}

export const getters = {
  scot_data: state => state.scot_data,
  voting_power: (state, getters, rootState) => {
    if (!state.scot_data) {
      return 0
    }

    return Math.min(
      state.scot_data.voting_power + ((Date.now() - state.scot_data.last_vote_timestamp) * 10000) / (1000 * rootState.tribe_config.vote_regeneration_seconds),
      10000
    )
  },
  downvoting_power: (state, getters, rootState) => {
    if (!state.scot_data) {
      return 0
    }

    return Math.min(
      state.scot_data.downvoting_power + ((Date.now() - state.scot_data.last_vote_timestamp) * 10000) / (1000 * rootState.tribe_config.downvote_regeneration_seconds),
      10000
    )
  },
  profiles: state => state.profiles,
  followers: state => state.followers,
  following: state => state.following
}

export const mutations = {
  SET_SCOT_DATA (state, data) {
    state.scot_data = data
  },

  SET_POROFILE (state, data) {
    state.profiles[data.name] = data
  },

  SET_FOLLOWERS (state, data) {
    state.followers = data
  },

  SET_FOLLOWING (state, data) {
    state.following = data
  },

  UPDATE_FOLLOWING (state, data) {
    let following = state.following.slice()

    if (data.what === 'blog') {
      following.push(data.following)
    } else {
      following = following.filter(f => f !== data.following)
    }

    state.following = following
  }
}

export const actions = {
  login ({ dispatch }, { username, nftmarketplace = false }) {
    if (!username) { return }

    if (!window.hive_keychain) { return }

    const ts = Date.now()

    window.hive_keychain.requestSignBuffer(username, `${username}${ts}`, 'Posting', async (r) => {
      if (r.success) {
        await dispatch('processLogin', { username, ts, sig: r.result, nftmarketplace })
      }
    })
  },

  async loginWithKey ({ dispatch }, { username, wif, nftmarketplace = false }) {
    if (!username) { return }

    if (!wif && !sessionStorage.getItem(`smartlock-${username}-posting`)) {
      try {
        wif = await dispatch('showUnlockModal', 'posting', { root: true })
      } catch {
        return
      }
    }

    wif = wif || sessionStorage.getItem(`smartlock-${username}-posting`)

    try {
      const ts = Date.now()
      const key = await WCDecrypt(wif, sessionStorage.getItem('smartlock-otp'))
      const privateKey = this.$chain.PrivateKey.fromString(key)
      const sig = privateKey.sign(Buffer.from(this.$chain.cryptoUtils.sha256(username + ts))).toString()

      await dispatch('processLogin', { username, ts, sig, smartlock: true, nftmarketplace })
    } catch (e) {
      console.log(e)
    }
  },

  async processLogin ({ dispatch, commit }, { username, ts, sig, smartlock = false, nftmarketplace }) {
    if (!nftmarketplace) {
      try {
        const { data } = await this.$auth.login({ data: { username, ts, sig, smartlock } })

        this.$auth.setUser({ ...data, smartlock })

        localStorage.setItem('username', username)
        localStorage.setItem('smartlock', smartlock)

        await Promise.all([
          dispatch('fetchFollowers', username),
          dispatch('fetchFollowing', username),
          dispatch('fetchAccountScotData')
        ])
      } catch {
      //
      }
    } else {
      try {
        const data = await this.$nftm.$post('auth/login', { username, ts, sig, site: this.$config.NFT_MARKETPLACE })

        commit('nftmarketplace/SET_USER', data, { root: true })
      } catch {
        //
      }
    }
  },

  async fetchAccountScotData ({ commit }) {
    if (!this.$auth.loggedIn) { return }

    let data = {
      voting_power: 10000,
      downvoting_power: 10000,
      staked_tokens: 0,
      last_vote_timestamp: 0
    }

    try {
      const [{ votingPower, downvotingPower, lastVoteTimestamp }, { stake, delegationsIn }] = await Promise.all([
        this.$sidechain.getVotingPower(this.$auth.user.username),
        this.$sidechain.getBalance(this.$auth.user.username, this.$config.TOKEN)
      ])

      data = {
        voting_power: votingPower,
        downvoting_power: downvotingPower,
        staked_tokens: Number(stake) + Number(delegationsIn),
        last_vote_timestamp: lastVoteTimestamp
      }
    } catch {
      //
    }

    commit('SET_SCOT_DATA', data)
  },

  async fetchFollowers ({ commit }) {
    const limit = 1000
    let start = ''
    let newData = 0

    const data = []
    const client = this.$chain.getClient()

    do {
      const results = await client.database.call('get_followers', [this.$auth.user.username, start, 'blog', limit])

      newData = (results.length < limit) ? 0 : results.length

      data.push(...results)

      if (results.length >= 1) {
        start = results[results.length - 1].follower
      }
    } while (newData > 0)

    const followers = data.map(d => d.follower)

    commit('SET_FOLLOWERS', followers)
  },

  async fetchFollowing ({ commit }) {
    const limit = 1000
    let start = ''
    let newData = 0

    const data = []
    const client = this.$chain.getClient()

    do {
      const results = await client.database.call('get_following', [this.$auth.user.username, start, 'blog', limit])

      newData = (results.length < limit) ? 0 : results.length

      data.push(...results)

      if (results.length >= 1) {
        start = results[results.length - 1].following
      }
    } while (newData > 0)

    const following = data.map(d => d.following)

    commit('SET_FOLLOWING', following)
  },

  async uploadFile ({ dispatch }, file) {
    try {
      const { username, smartlock } = this.$auth.user

      const { miniurl: dataUrl, name: filename } = file
      const commaIdx = dataUrl.indexOf(',')
      const dataBs64 = dataUrl.substring(commaIdx + 1)
      const data = Buffer.from(dataBs64, 'base64')

      const prefix = Buffer.from('ImageSigningChallenge')
      const buf = Buffer.concat([prefix, data])

      const formData = new FormData()

      formData.append('filename', file)
      formData.append('filename', filename)
      formData.append('filebase64', dataBs64)

      let sig

      if (smartlock) {
        const wif = localStorage.getItem(`smartlock-${username}`)
        const key = (wif.length > 51) ? atob(wif) : wif
        const privateKey = this.$chain.PrivateKey.fromString(key)

        sig = privateKey.sign(Buffer.from(this.$chain.cryptoUtils.sha256(buf))).toString()
      } else {
        const response = await new Promise((resolve, reject) => {
          (window[this.$config.IS_HIVE ? 'hive_keychain' : 'steem_keychain']).requestSignBuffer(this.$auth.user.username, JSON.stringify(buf), 'Posting', (response) => {
            resolve(response)
          })
        })

        sig = response.success ? response.result : null
      }

      if (sig) {
        const { url } = await this.$axios.$post(`${this.$config.IMAGE_UPLOAD_SERVER}/${this.$auth.user.username}/${sig}`, formData)

        return url
      }
    } catch (e) {
      console.log(e.message)

      dispatch('showNotification', { title: 'Upload Failed', type: 'error', message: e.message }, { root: true })
    }

    return null
  },

  requestBroadcastFollow ({ dispatch }, { following, what = 'blog' }) {
    try {
      const operations = [['custom_json', {
        required_auths: [],
        required_posting_auths: [this.$auth.user.username],
        id: 'follow',
        json: JSON.stringify(['follow', { follower: this.$auth.user.username, following, what: [what] }])
      }]]

      const emitData = { following, what }

      const emitEvent = `user-${what === '' ? 'unfollow' : what === 'blog' ? 'follow' : 'mute'}-successful`

      dispatch('requestBroadcastOps', { operations, emitEvent, emitData, mutation: 'user/UPDATE_FOLLOWING', mutationData: emitData }, { root: true })
    } catch {
      //
    }
  },

  requestTokenAction ({ dispatch, rootState }, { action, amount, symbol, to, memo }) {
    symbol = symbol || this.$config.TOKEN

    const op = {
      contractName: 'tokens',
      contractAction: action,
      contractPayload: {
        symbol,
        quantity: toFixedWithoutRounding(amount, rootState.tribe_info.precision).toString()
      }
    }

    if (['transfer', 'stake', 'delegate'].includes(action)) {
      op.contractPayload.to = to
    }

    if (action === 'transfer') {
      op.contractPayload.memo = memo
    }

    const operations = [['custom_json', {
      required_auths: [this.$auth.user.username],
      required_posting_auths: [],
      id: this.$config.SIDECHAIN_ID,
      json: JSON.stringify(op)
    }]]

    dispatch('requestBroadcastOps', { operations, emitEvent: `tokens-${action}-successful`, keyType: 'Active' }, { root: true })
  },

  requestRedeemRewards ({ dispatch }) {
    try {
      const operations = [['custom_json', {
        required_auths: [],
        required_posting_auths: [this.$auth.user.username],
        id: 'scot_claim_token',
        json: JSON.stringify({ symbol: this.$config.TOKEN })
      }]]

      dispatch('requestBroadcastOps', { operations, emitEvent: 'redeem-rewards-successful' }, { root: true })
    } catch {
      //
    }
  },

  requestAccountUpdate ({ dispatch }, profile) {
    try {
      const operations = [['account_update2', {
        account: this.$auth.user.username,
        json_metadata: '',
        posting_json_metadata: JSON.stringify({ profile })
      }]]

      dispatch('requestBroadcastOps', { operations, emitEvent: 'account-update-successful' }, { root: true })
    } catch {
      //
    }
  },

  async requestBroadcastMute ({ dispatch, rootGetters }, { account, mute }) {
    try {
      await dispatch('showConfirmation', {
        title: `${mute ? 'Mute' : 'Unmute'} User`,
        message: `Are you sure you want to ${mute ? 'mute' : 'unmute'} @${account}?`,
        okText: 'Yes',
        cancelText: 'Cancel'
      }, { root: true })

      const operations = [['custom_json', {
        required_auths: [rootGetters.muting_account],
        required_posting_auths: [],
        id: this.$config.SIDECHAIN_ID,
        json: JSON.stringify({
          contractName: 'comments',
          contractAction: 'setMute',
          contractPayload: {
            rewardPoolId: rootGetters.tribe_config.reward_pool_id,
            account,
            mute
          }
        })
      }]]

      const emitData = { account, mute }
      const emitEvent = 'user-mute-successful'

      dispatch('requestBroadcastOps', { operations, emitEvent, emitData, keyType: 'active' }, { root: true })
    } catch {
      //
    }
  }
}
