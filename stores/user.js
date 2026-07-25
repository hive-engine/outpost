// Ported from legacy/store/user.js (Vuex module) → Pinia 'user' store.
// Buffer: webpack 4 polyfilled this globally; Vite does not — import explicitly.
import { Buffer } from 'buffer'
import { defineStore } from 'pinia'
import { toFixedWithoutRounding } from '~/utils'
import { decrypt as WCDecrypt } from '~/utils/web-crypto'
import { useAuthStore } from '~/stores/auth'
import { useTribeStore } from '~/stores/tribe'
import { useNftMarketplaceStore } from '~/stores/nftmarketplace'

export const useUserStore = defineStore('user', {
  state: () => {
    return {
      smartlock: false,
      scot_data: {},
      profiles: {},
      followers: [],
      following: []
    }
  },

  getters: {
    // Legacy mirror getters (scot_data, profiles, followers, following) dropped — in Pinia a
    // getter can't share a name with a state property; state is accessed directly instead.
    voting_power: (state) => {
      if (!state.scot_data) {
        return 0
      }

      return Math.min(
        state.scot_data.voting_power + ((Date.now() - state.scot_data.last_vote_timestamp) * 10000) / (1000 * useTribeStore().tribe_config.vote_regeneration_seconds),
        10000
      )
    },
    downvoting_power: (state) => {
      if (!state.scot_data) {
        return 0
      }

      return Math.min(
        state.scot_data.downvoting_power + ((Date.now() - state.scot_data.last_vote_timestamp) * 10000) / (1000 * useTribeStore().tribe_config.downvote_regeneration_seconds),
        10000
      )
    }
  },

  actions: {
    SET_SCOT_DATA (data) {
      this.scot_data = data
    },

    SET_POROFILE (data) {
      this.profiles[data.name] = data
    },

    SET_FOLLOWERS (data) {
      this.followers = data
    },

    SET_FOLLOWING (data) {
      this.following = data
    },

    UPDATE_FOLLOWING (data) {
      let following = this.following.slice()

      if (data.what === 'blog') {
        following.push(data.following)
      } else {
        following = following.filter(f => f !== data.following)
      }

      this.following = following
    },

    login ({ username, nftmarketplace = false }) {
      if (!username) { return }

      if (!window.hive_keychain) { return }

      const ts = Date.now()

      window.hive_keychain.requestSignBuffer(username, `${username}${ts}`, 'Posting', async (r) => {
        if (r.success) {
          await this.processLogin({ username, ts, sig: r.result, nftmarketplace })
        }
      })
    },

    async loginWithKey ({ username, wif, nftmarketplace = false }) {
      const { $chain } = this.$nuxt

      if (!username) { return }

      if (!wif && !sessionStorage.getItem(`smartlock-${username}-posting`)) {
        try {
          wif = await useTribeStore().showUnlockModal('posting')
        } catch {
          return
        }
      }

      wif = wif || sessionStorage.getItem(`smartlock-${username}-posting`)

      try {
        const ts = Date.now()
        const key = await WCDecrypt(wif, sessionStorage.getItem('smartlock-otp'))
        const privateKey = $chain.PrivateKey.fromString(key)
        const sig = privateKey.sign(Buffer.from($chain.cryptoUtils.sha256(username + ts))).toString()

        await this.processLogin({ username, ts, sig, smartlock: true, nftmarketplace })
      } catch (e) {
        console.log(e)
      }
    },

    async processLogin ({ username, ts, sig, smartlock = false, nftmarketplace }) {
      if (!nftmarketplace) {
        try {
          const authStore = useAuthStore()

          const { data } = await authStore.login({ data: { username, ts, sig, smartlock } })

          authStore.user = { ...data, smartlock } // was this.$auth.setUser(...)

          localStorage.setItem('username', username)
          localStorage.setItem('smartlock', smartlock)

          await Promise.all([
            this.fetchFollowers(username),
            this.fetchFollowing(username),
            this.fetchAccountScotData()
          ])
        } catch {
        //
        }
      } else {
        try {
          const { $nftm } = this.$nuxt
          const config = useRuntimeConfig().public

          const data = await $nftm.$post('auth/login', { username, ts, sig, site: config.NFT_MARKETPLACE })

          useNftMarketplaceStore().SET_USER(data)
        } catch {
          //
        }
      }
    },

    async fetchAccountScotData () {
      const { $sidechain } = this.$nuxt
      const config = useRuntimeConfig().public
      const authStore = useAuthStore()

      if (!authStore.loggedIn) { return }

      let data = {
        voting_power: 10000,
        downvoting_power: 10000,
        staked_tokens: 0,
        last_vote_timestamp: 0
      }

      try {
        const [{ votingPower, downvotingPower, lastVoteTimestamp }, { stake, delegationsIn }] = await Promise.all([
          $sidechain.getVotingPower(authStore.user.username),
          $sidechain.getBalance(authStore.user.username, config.TOKEN)
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

      this.SET_SCOT_DATA(data)
    },

    async fetchFollowers () {
      const { $chain } = this.$nuxt
      const authStore = useAuthStore()

      const limit = 1000
      let start = ''
      let newData = 0

      const data = []
      const client = $chain.getClient()

      do {
        const results = await client.database.call('get_followers', [authStore.user.username, start, 'blog', limit])

        newData = (results.length < limit) ? 0 : results.length

        data.push(...results)

        if (results.length >= 1) {
          start = results[results.length - 1].follower
        }
      } while (newData > 0)

      const followers = data.map(d => d.follower)

      this.SET_FOLLOWERS(followers)
    },

    async fetchFollowing () {
      const { $chain } = this.$nuxt
      const authStore = useAuthStore()

      const limit = 1000
      let start = ''
      let newData = 0

      const data = []
      const client = $chain.getClient()

      do {
        const results = await client.database.call('get_following', [authStore.user.username, start, 'blog', limit])

        newData = (results.length < limit) ? 0 : results.length

        data.push(...results)

        if (results.length >= 1) {
          start = results[results.length - 1].following
        }
      } while (newData > 0)

      const following = data.map(d => d.following)

      this.SET_FOLLOWING(following)
    },

    async uploadFile (file) {
      const { $chain, $api } = this.$nuxt
      const config = useRuntimeConfig().public
      const authStore = useAuthStore()

      try {
        const { username, smartlock } = authStore.user

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
          const privateKey = $chain.PrivateKey.fromString(key)

          sig = privateKey.sign(Buffer.from($chain.cryptoUtils.sha256(buf))).toString()
        } else {
          const response = await new Promise((resolve, reject) => {
            (window[config.IS_HIVE ? 'hive_keychain' : 'steem_keychain']).requestSignBuffer(authStore.user.username, JSON.stringify(buf), 'Posting', (response) => {
              resolve(response)
            })
          })

          sig = response.success ? response.result : null
        }

        if (sig) {
          const { url } = await $api.$post(`${config.IMAGE_UPLOAD_SERVER}/${authStore.user.username}/${sig}`, formData)

          return url
        }
      } catch (e) {
        console.log(e.message)

        useTribeStore().showNotification({ title: 'Upload Failed', type: 'error', message: e.message })
      }

      return null
    },

    requestBroadcastFollow ({ following, what = 'blog' }) {
      const authStore = useAuthStore()

      try {
        const operations = [['custom_json', {
          required_auths: [],
          required_posting_auths: [authStore.user.username],
          id: 'follow',
          json: JSON.stringify(['follow', { follower: authStore.user.username, following, what: [what] }])
        }]]

        const emitData = { following, what }

        const emitEvent = `user-${what === '' ? 'unfollow' : what === 'blog' ? 'follow' : 'mute'}-successful`

        useTribeStore().requestBroadcastOps({ operations, emitEvent, emitData, mutation: 'user/UPDATE_FOLLOWING', mutationData: emitData })
      } catch {
        //
      }
    },

    requestTokenAction ({ action, amount, symbol, to, memo }) {
      const config = useRuntimeConfig().public
      const authStore = useAuthStore()
      const tribeStore = useTribeStore()

      symbol = symbol || config.TOKEN

      const op = {
        contractName: 'tokens',
        contractAction: action,
        contractPayload: {
          symbol,
          quantity: toFixedWithoutRounding(amount, tribeStore.tribe_info.precision).toString()
        }
      }

      if (['transfer', 'stake', 'delegate'].includes(action)) {
        op.contractPayload.to = to
      }

      if (action === 'transfer') {
        op.contractPayload.memo = memo
      }

      const operations = [['custom_json', {
        required_auths: [authStore.user.username],
        required_posting_auths: [],
        id: config.SIDECHAIN_ID,
        json: JSON.stringify(op)
      }]]

      tribeStore.requestBroadcastOps({ operations, emitEvent: `tokens-${action}-successful`, keyType: 'Active' })
    },

    requestRedeemRewards () {
      const config = useRuntimeConfig().public
      const authStore = useAuthStore()

      try {
        const operations = [['custom_json', {
          required_auths: [],
          required_posting_auths: [authStore.user.username],
          id: 'scot_claim_token',
          json: JSON.stringify({ symbol: config.TOKEN })
        }]]

        useTribeStore().requestBroadcastOps({ operations, emitEvent: 'redeem-rewards-successful' })
      } catch {
        //
      }
    },

    requestAccountUpdate (profile) {
      const authStore = useAuthStore()

      try {
        const operations = [['account_update2', {
          account: authStore.user.username,
          json_metadata: '',
          posting_json_metadata: JSON.stringify({ profile })
        }]]

        useTribeStore().requestBroadcastOps({ operations, emitEvent: 'account-update-successful' })
      } catch {
        //
      }
    },

    async requestBroadcastMute ({ account, mute }) {
      const config = useRuntimeConfig().public
      const tribeStore = useTribeStore()

      try {
        await tribeStore.showConfirmation({
          title: `${mute ? 'Mute' : 'Unmute'} User`,
          message: `Are you sure you want to ${mute ? 'mute' : 'unmute'} @${account}?`,
          okText: 'Yes',
          cancelText: 'Cancel'
        })

        const operations = [['custom_json', {
          required_auths: [tribeStore.muting_account],
          required_posting_auths: [],
          id: config.SIDECHAIN_ID,
          json: JSON.stringify({
            contractName: 'comments',
            contractAction: 'setMute',
            contractPayload: {
              rewardPoolId: tribeStore.tribe_config.reward_pool_id,
              account,
              mute
            }
          })
        }]]

        const emitData = { account, mute }
        const emitEvent = 'user-mute-successful'

        tribeStore.requestBroadcastOps({ operations, emitEvent, emitData, keyType: 'active' })
      } catch {
        //
      }
    }
  }
})
