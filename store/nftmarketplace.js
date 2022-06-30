import { arrayChunk } from '@/utils'

export const state = () => {
  return {
    settings: null,
    hive_price: 0,
    token_price: 0,
    cart: [],
    series_info: {},

    user: null
  }
}

export const getters = {
  settings: state => state.settings,
  cart: state => state.cart,
  hive_price: state => state.hive_price,
  token_price: (state) => {
    return (state.settings.currency === 'SWAP.HIVE') ? state.hive_price : state.token_price
  },
  series_info: state => state.series_info,
  isLoggedIn: state => Boolean(state.user),
  isWhitelisted: state => Boolean(state.user && state.user.whitelisted),
  isAdmin: state => Boolean(state.user && state.user.scope.includes('admin'))
}

export const mutations = {
  SET_SETTINGS (state, data) {
    state.settings = data
  },

  SET_HIVE_PRICE (state, data) {
    state.hive_price = data
  },

  SET_TOKEN_PRICE (state, data) {
    state.token_price = data
  },

  ADD_TO_CART (state, data) {
    state.cart.push(data)
  },

  REMOVE_FROM_CART (state, data) {
    const cart = state.cart.filter(c => c.nft_id !== data)

    state.cart = cart
  },

  EMPTY_CART (state, data) {
    if (!data) {
      state.cart = []
    } else {
      data = data.map(d => Number(d))
      state.cart = state.cart.filter(c => !data.includes(c.nft_id))
    }
  },

  SET_SERIES_INFO (state, data) {
    data.forEach((s) => {
      state.series_info[s.series] = s
    })
  },

  SET_USER (state, data) {
    state.user = data.user

    if (data.access_token) {
      this.$cookies.set('nftm_access_token', data.access_token, {
        path: '/',
        maxAge: 30 * 60,
        sameSite: true
      })
    }

    if (data.refresh_token) {
      this.$cookies.set('nftm_refresh_token', data.refresh_token, {
        path: '/',
        maxAge: 90 * 24 * 60 * 60,
        sameSite: true
      })
    }
  }
}

export const actions = {
  async fetchSettings ({ commit, state }, forced = false) {
    try {
      if (!state.settings || forced) {
        const settings = await this.$nftm.$get(`/settings/${this.$config.NFT_MARKETPLACE}`)

        commit('SET_SETTINGS', settings)
      }
    } catch {

    }
  },

  async fetchHivePrice ({ commit }) {
    try {
      const result = await this.$axios.$get('https://api.coingecko.com/api/v3/simple/price?ids=HIVE&vs_currencies=USD')

      if (result) {
        commit('SET_HIVE_PRICE', result.hive.usd)
      }
    } catch {
      //
    }
  },

  async fetchTokenPrice ({ commit, state }) {
    if (!state.settings || state.settings.currency === 'SWAP.HIVE') {
      return
    }

    try {
      const metrics = await this.$sidechain.getMetrics(state.settings.currency)

      if (metrics) {
        commit('SET_TOKEN_PRICE', state.hive_price * Number(metrics.lastPrice))
      }
    } catch {
      //
    }
  },

  async fetchForSale ({ dispatch, state }, query) {
    try {
      const limit = 1000
      let results = []
      let newData = 0
      let offset = 0

      do {
        const data = await this.$sidechain.getNFTSellBook({ symbol: state.settings.nft_symbol, ...query }, offset, limit)
        newData = data.length

        if (data.length > 0) {
          results.push(...data)

          if (data.length < limit) {
            newData = 0
          }
        }
        offset += 1000
      } while (newData > 0)

      results = results.map(c => ({
        account: c.account,
        nft_id: Number(c.nftId),
        series: c.grouping.series,
        price: Number(c.price),
        symbol: c.priceSymbol,
        fee: c.fee,
        for_sale: true
      }))

      const mappedInstances = await dispatch('fetchInstances', results.map(m => m.nft_id))

      return results.reduce((acc, cur) => {
        const instance = mappedInstances.get(cur.nft_id)

        acc.push({ ...cur, ...instance })
        return acc
      }, [])
    } catch (e) {
      console.log(e.message)
    }
  },

  async fetchCollection ({ dispatch, state }, query) {
    try {
      const limit = 1000
      let results = []
      let newData = 0
      let offset = 0

      do {
        const data = await this.$sidechain.getNFTInstances({ symbol: state.settings.nft_symbol, ...query }, offset, limit)
        newData = data.length

        if (data.length > 0) {
          results.push(...data)

          if (data.length < limit) {
            newData = 0
          }
        }
        offset += 1000
      } while (newData > 0)

      results = results.map(c => ({
        account: c.account,
        nft_id: Number(c._id),
        series: c.properties.series,
        edition: c.properties.edition,
        metadata: JSON.parse(c.properties.metadata),
        for_sale: false
      }))

      return results
    } catch (e) {
      console.log(e.message)
    }
  },

  async fetchInstances ({ state }, ids) {
    try {
      let nfts = await this.$sidechain.getNFTInstances({ symbol: state.settings.nft_symbol, _id: { $in: ids } })

      nfts = nfts.map(n => [n._id, { nft_id: n._id, ...n.properties, metadata: JSON.parse(n.properties.metadata) }])

      return new Map(nfts)
    } catch (e) {
      console.log(e.message)
    }
  },

  async fetchSeriesInfo ({ commit, state }, seriesNames) {
    const cachedSeries = Object.keys(state.series_info)

    const series = seriesNames.filter(s => !cachedSeries.includes(s))

    if (series.length > 0) {
      const promises = []

      const chunks = arrayChunk(series, 500)

      for (let i = 0; i < chunks.length; i += 1) {
        promises.push(this.$nftm.$post('collectibles/info', { series: chunks[i].toString() }))
      }

      const seriesData = (await Promise.all(promises)).flat(Infinity)

      commit('SET_SERIES_INFO', seriesData)
    }
  },

  async fetchUserInfo ({ commit }) {
    try {
      const { user } = await this.$nftm.$post('auth/me', { site: this.$config.NFT_MARKETPLACE })

      if (user && user.username === this.$auth.user.username) {
        commit('SET_USER', { user })
      }
    } catch {
      //
    }
  },

  async requestLoginToMarketplace ({ dispatch }) {
    try {
      if (this.$auth.user.smartlock) {
        await dispatch('user/loginWithKey', { username: this.$auth.user.username, nftmarketplace: true }, { root: true })
      } else {
        await dispatch('user/login', { username: this.$auth.user.username, nftmarketplace: true }, { root: true })
      }
    } catch {
      //
    }
  },

  async requestUpdateProfile (_, data) {
    try {
      await this.$nftm.$post('users/profile', data)

      this.$eventBus.$emit('nftmarketplace-profile-updated')
    } catch {
      //
    }
  },

  async requestApplyForWhitelist () {
    try {
      await this.$nftm.$post('users/whitelist/apply')

      this.$eventBus.$emit('nftmarketplace-whitelist-apply-successful')
    } catch {
      //
    }
  },

  requestApplyForAutoWhitelist ({ state, dispatch }) {
    const { amount, symbol } = state.settings.whitelist_payment_requirement

    const json = {
      contractName: 'tokens',
      contractAction: 'transfer',
      contractPayload: {
        symbol,
        to: state.settings.account,
        quantity: amount.toString(),
        memo: JSON.stringify({ action: 'whitelist-apply' })
      }
    }

    const jsonData = {
      id: this.$config.SIDECHAIN_ID,
      keyType: 'Active',
      json,
      message: 'Auto Whitelist Application',
      eventName: 'nftmarketplace-whitelist-apply-successful'
    }

    dispatch('requestBroadcastJson', jsonData, { root: true })
  },

  requestMintTokens ({ state, dispatch }, { fee, payload }) {
    const json = {
      contractName: 'tokens',
      contractAction: 'transfer',
      contractPayload: {
        symbol: state.settings.currency,
        to: state.settings.account,
        quantity: fee.toString(),
        memo: JSON.stringify(payload)
      }
    }

    const jsonData = {
      id: state.settings.sidechain_id,
      keyType: 'Active',
      json,
      message: 'Mint Tokens',
      eventName: 'nftmarketplace-mint-tokens-successful'
    }

    dispatch('requestBroadcastJson', jsonData, { root: true })
  },

  async validateTokenIssuance (_, trxId) {
    let trx = null
    let count = 0

    do {
      try {
        await this.$chain.sleep(6 * 1000)

        trx = await this.$nftm.$get('transactions/find', { params: { trx_id: trxId } })
      } catch {
        //
      }

      count += 1
    } while (!trx && count < 10)

    if (trx) {
      this.$eventBus.$emit('nftmarketplace-mint-tokens-validated', trx)
    } else {
      this.$eventBus.$emit('nftmarketplace-mint-tokens-not-validated')
    }
  },

  requestTransfer ({ state, dispatch }, recipient) {
    const nfts = state.cart.filter(c => c.account === this.$auth.user.username && !c.for_sale).map(c => c.nft_id.toString())

    const json = {
      contractName: 'nft',
      contractAction: 'transfer',
      contractPayload: {
        to: recipient,
        nfts: [
          { symbol: state.settings.nft_symbol, ids: nfts }
        ]
      }
    }

    const jsonData = {
      id: state.settings.sidechain_id,
      keyType: 'Active',
      json,
      message: `Transfer NFT (${state.settings.nft_symbol})`,
      eventName: 'nft-multiple-transfer-successful',
      mutation: 'nftmarketplace/EMPTY_CART',
      mutationData: nfts
    }

    dispatch('requestBroadcastJson', jsonData, { root: true })
  },

  async requestTransferMultiple ({ commit, state, dispatch }, recipients) {
    const nfts = state.cart.filter(c => c.account === this.$auth.user.username && !c.for_sale).map(c => c.nft_id.toString())

    const recipientsWithNfts = recipients.reduce((acc, cur) => {
      if (!acc[cur]) {
        acc[cur] = []
      }

      acc[cur].push(nfts.shift())

      return acc
    }, {})

    const recipientChunks = arrayChunk(Object.keys(recipientsWithNfts), 5)

    const ops = recipientChunks.reduce((acc, chunk) => {
      const json = []

      const nftIds = []

      chunk.forEach((recipient) => {
        const ids = recipientsWithNfts[recipient]

        nftIds.push(ids)

        json.push({
          contractName: 'nft',
          contractAction: 'transfer',
          contractPayload: {
            to: recipient,
            nfts: [
              { symbol: state.settings.nft_symbol, ids }
            ]
          }
        })
      })

      acc.push({
        id: state.settings.sidechain_id,
        keyType: 'Active',
        json,
        message: `Transfer NFT (${state.settings.nft_symbol})`,
        eventName: 'nft-transfer-successful',
        mutation: 'nftmarketplace/EMPTY_CART',
        mutationData: nftIds.flat(Infinity)
      })

      return acc
    }, [])

    commit('SET_JSON_OPS', ops, { root: true })

    await dispatch('requestBroadcastMultipleJson', {}, { root: true })
  },

  requestSell ({ state, dispatch }, price) {
    const nfts = state.cart.filter(c => c.account === this.$auth.user.username && !c.for_sale).map(c => c.nft_id.toString())

    const json = {
      contractName: 'nftmarket',
      contractAction: 'sell',
      contractPayload: {
        symbol: state.settings.nft_symbol,
        nfts,
        price: price.toString(),
        priceSymbol: state.settings.currency,
        fee: state.settings.market_fee
      }
    }

    const jsonData = {
      id: state.settings.sidechain_id,
      keyType: 'Active',
      json,
      message: `Sell NFT (${state.settings.nft_symbol})`,
      eventName: 'nft-sell-successful',
      mutation: 'nftmarketplace/EMPTY_CART',
      mutationData: nfts
    }

    dispatch('requestBroadcastJson', jsonData, { root: true })
  },

  requestCancelSale ({ state, dispatch }) {
    const nfts = state.cart.filter(c => c.for_sale && c.account === this.$auth.user.username).map(c => c.nft_id.toString())

    const json = {
      contractName: 'nftmarket',
      contractAction: 'cancel',
      contractPayload: {
        symbol: state.settings.nft_symbol,
        nfts
      }
    }

    const jsonData = {
      id: state.settings.sidechain_id,
      keyType: 'Active',
      json,
      message: `Cancel Sale NFT (${state.settings.nft_symbol})`,
      eventName: 'nft-cancel-sell-successful',
      mutation: 'nftmarketplace/EMPTY_CART',
      mutationData: nfts
    }

    dispatch('requestBroadcastJson', jsonData, { root: true })
  },

  requestChangePrice ({ state, dispatch }, price) {
    const nfts = state.cart.filter(c => c.for_sale && c.account === this.$auth.user.username).map(c => c.nft_id.toString())

    const json = {
      contractName: 'nftmarket',
      contractAction: 'changePrice',
      contractPayload: {
        symbol: state.settings.nft_symbol,
        nfts,
        price: price.toString()
      }
    }

    const jsonData = {
      id: state.settings.sidechain_id,
      keyType: 'Active',
      json,
      message: `Change Price NFT (${state.settings.nft_symbol})`,
      eventName: 'nft-change-price-successful',
      mutation: 'nftmarketplace/EMPTY_CART',
      mutationData: nfts
    }

    dispatch('requestBroadcastJson', jsonData, { root: true })
  },

  requestBuy ({ state, dispatch }) {
    const nfts = state.cart.filter(c => c.account !== this.$auth.user.username && c.for_sale && c.price > 0).map(c => c.nft_id.toString())

    const json = {
      contractName: 'nftmarket',
      contractAction: 'buy',
      contractPayload: {
        symbol: state.settings.nft_symbol,
        nfts,
        marketAccount: state.settings.account
      }
    }

    const jsonData = {
      id: state.settings.sidechain_id,
      keyType: 'Active',
      json,
      message: `Buy NFT (${state.settings.nft_symbol})`,
      eventName: 'nft-buy-successful',
      mutation: 'nftmarketplace/EMPTY_CART',
      mutationData: nfts
    }

    dispatch('requestBroadcastJson', jsonData, { root: true })
  },

  requestBurn ({ state, dispatch }) {
    const nfts = state.cart.filter(c => c.account === this.$auth.user.username && !c.for_sale).map(c => c.nft_id.toString())

    const json = {
      contractName: 'nft',
      contractAction: 'burn',
      contractPayload: {
        nfts: [
          { symbol: state.settings.nft_symbol, ids: nfts }
        ]
      }
    }

    const jsonData = {
      id: state.settings.sidechain_id,
      keyType: 'Active',
      json,
      message: `Burn NFT  (${state.settings.nft_symbol})`,
      eventName: 'nft-burn-successful',
      mutation: 'nftmarketplace/EMPTY_CART',
      mutationData: nfts
    }

    dispatch('requestBroadcastJson', jsonData, { root: true })
  },

  requestManageCollectible ({ state, dispatch }, data) {
    const jsonData = {
      id: `${state.settings.prefix}_manage_collectible`,
      keyType: 'Active',
      json: { ...data, site: state.settings.site },
      message: 'Manage Collectible',
      eventName: 'manage-collectible-successful',
      emitData: data
    }

    dispatch('requestBroadcastJson', jsonData, { root: true })
  },

  requestManageUser ({ state, dispatch }, data) {
    const jsonData = {
      id: `${state.settings.prefix}_manage_user`,
      keyType: 'Active',
      json: { ...data, site: state.settings.site },
      message: 'Manage User',
      eventName: 'manage-user-successful',
      emitData: data
    }

    dispatch('requestBroadcastJson', jsonData, { root: true })
  },

  requestFeatureCollectible ({ state, dispatch }, data) {
    const jsonData = {
      id: `${state.settings.prefix}_feature_collectible`,
      keyType: 'Active',
      json: { ...data, site: state.settings.site },
      message: 'Feature Collectible',
      eventName: 'feature-collectible-successful',
      emitData: data
    }

    dispatch('requestBroadcastJson', jsonData, { root: true })
  },

  requestProcessReport ({ state, dispatch }, data) {
    const jsonData = {
      id: `${state.settings.prefix}_process_report`,
      keyType: 'Active',
      json: { ...data, site: state.settings.site },
      message: 'Process Report',
      eventName: 'process-report-successful',
      emitData: data
    }

    dispatch('requestBroadcastJson', jsonData, { root: true })
  },

  requestManualIssue ({ state, dispatch }, data) {
    const jsonData = {
      id: `${state.settings.prefix}_manual_issue`,
      keyType: 'Active',
      json: { ...data, site: state.settings.site },
      message: 'Manual Issue',
      eventName: 'manual-issue-successful',
      emitData: data
    }

    dispatch('requestBroadcastJson', jsonData, { root: true })
  },

  async requestProcessApplication (ctx, { username, action, value }) {
    try {
      const { success } = await this.$nftm.$post('admin/whitelist', { username, action, value })

      if (success) {
        this.$eventBus.$emit('process-application-succesful', { username, action, value })
      }
    } catch (e) {
      console.log(e.message)
    }
  },

  requestReportCollectible ({ state, dispatch }, data) {
    const jsonData = {
      id: `${state.settings.prefix}_report_collectible`,
      keyType: 'Posting',
      json: { ...data, site: state.settings.site },
      message: 'Report',
      eventName: 'nftmarketplace-report-successful'
    }

    dispatch('requestBroadcastJson', jsonData, { root: true })
  }
}
