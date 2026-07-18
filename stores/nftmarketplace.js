import { defineStore } from 'pinia'
import { arrayChunk } from '@/utils'
import { useTribeStore } from '~/stores/tribe'
import { useUserStore } from '~/stores/user'
import { useAuthStore } from '~/stores/auth'

// Identity getters from the Vuex module (settings, cart, hive_price, series_info)
// are dropped — Pinia exposes state directly under the same names.
// The raw token price state is renamed to `token_price_raw` because Pinia does not
// allow a getter and a state property to share a name; the public `token_price`
// getter keeps its legacy (computed) semantics.
export const useNftMarketplaceStore = defineStore('nftmarketplace', {
  state: () => ({
    settings: null,
    hive_price: 0,
    token_price_raw: 0,
    cart: [],
    series_info: {},

    user: null
  }),

  getters: {
    token_price: (state) => {
      return (state.settings.currency === 'SWAP.HIVE') ? state.hive_price : state.token_price_raw
    },
    isLoggedIn: state => Boolean(state.user),
    isWhitelisted: state => Boolean(state.user && state.user.whitelisted),
    isAdmin: state => Boolean(state.user && state.user.scope.includes('admin'))
  },

  actions: {
    SET_SETTINGS (data) {
      this.settings = data
    },

    SET_HIVE_PRICE (data) {
      this.hive_price = data
    },

    SET_TOKEN_PRICE (data) {
      this.token_price_raw = data
    },

    ADD_TO_CART (data) {
      this.cart.push(data)
    },

    REMOVE_FROM_CART (data) {
      const cart = this.cart.filter(c => c.nft_id !== data)

      this.cart = cart
    },

    EMPTY_CART (data) {
      if (!data) {
        this.cart = []
      } else {
        data = data.map(d => Number(d))
        this.cart = this.cart.filter(c => !data.includes(c.nft_id))
      }
    },

    SET_SERIES_INFO (data) {
      data.forEach((s) => {
        this.series_info[s.series] = s
      })
    },

    SET_USER (data) {
      this.user = data.user

      if (data.access_token) {
        useCookie('nftm_access_token', {
          path: '/',
          maxAge: 30 * 60,
          sameSite: true
        }).value = data.access_token
      }

      if (data.refresh_token) {
        useCookie('nftm_refresh_token', {
          path: '/',
          maxAge: 90 * 24 * 60 * 60,
          sameSite: true
        }).value = data.refresh_token
      }
    },

    async fetchSettings (forced = false) {
      const { $nftm } = this.$nuxt
      const config = useRuntimeConfig().public

      try {
        if (!this.settings || forced) {
          const settings = await $nftm.$get(`/settings/${config.NFT_MARKETPLACE}`)

          this.SET_SETTINGS(settings)
        }
      } catch {

      }
    },

    async fetchHivePrice () {
      const { $api } = this.$nuxt

      try {
        const result = await $api.$get('https://api.coingecko.com/api/v3/simple/price?ids=HIVE&vs_currencies=USD')

        if (result) {
          this.SET_HIVE_PRICE(result.hive.usd)
        }
      } catch {
        //
      }
    },

    async fetchTokenPrice () {
      const { $sidechain } = this.$nuxt

      if (!this.settings || this.settings.currency === 'SWAP.HIVE') {
        return
      }

      try {
        const metrics = await $sidechain.getMetrics(this.settings.currency)

        if (metrics) {
          this.SET_TOKEN_PRICE(this.hive_price * Number(metrics.lastPrice))
        }
      } catch {
        //
      }
    },

    async fetchForSale (query) {
      const { $sidechain } = this.$nuxt

      try {
        const limit = 1000
        let results = []
        let newData = 0
        let offset = 0

        do {
          const data = await $sidechain.getNFTSellBook({ symbol: this.settings.nft_symbol, ...query }, offset, limit)
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

        const mappedInstances = await this.fetchInstances(results.map(m => m.nft_id))

        return results.reduce((acc, cur) => {
          const instance = mappedInstances.get(cur.nft_id)

          acc.push({ ...cur, ...instance })
          return acc
        }, [])
      } catch (e) {
        console.log(e.message)
      }
    },

    async fetchCollection (query) {
      const { $sidechain } = this.$nuxt

      try {
        const limit = 1000
        let results = []
        let newData = 0
        let offset = 0

        do {
          const data = await $sidechain.getNFTInstances({ symbol: this.settings.nft_symbol, ...query }, offset, limit)
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

    async fetchInstances (ids) {
      const { $sidechain } = this.$nuxt

      try {
        let nfts = await $sidechain.getNFTInstances({ symbol: this.settings.nft_symbol, _id: { $in: ids } })

        nfts = nfts.map(n => [n._id, { nft_id: n._id, ...n.properties, metadata: JSON.parse(n.properties.metadata) }])

        return new Map(nfts)
      } catch (e) {
        console.log(e.message)
      }
    },

    async fetchSeriesInfo (seriesNames) {
      const { $nftm } = this.$nuxt

      const cachedSeries = Object.keys(this.series_info)

      const series = seriesNames.filter(s => !cachedSeries.includes(s))

      if (series.length > 0) {
        const promises = []

        const chunks = arrayChunk(series, 500)

        for (let i = 0; i < chunks.length; i += 1) {
          promises.push($nftm.$post('collectibles/info', { series: chunks[i].toString() }))
        }

        const seriesData = (await Promise.all(promises)).flat(Infinity)

        this.SET_SERIES_INFO(seriesData)
      }
    },

    async fetchUserInfo () {
      const { $nftm } = this.$nuxt
      const config = useRuntimeConfig().public

      try {
        const { user } = await $nftm.$post('auth/me', { site: config.NFT_MARKETPLACE })

        if (user && user.username === useAuthStore().user.username) {
          this.SET_USER({ user })
        }
      } catch {
        //
      }
    },

    async requestLoginToMarketplace () {
      const authStore = useAuthStore()
      const userStore = useUserStore()

      try {
        if (authStore.user.smartlock) {
          await userStore.loginWithKey({ username: authStore.user.username, nftmarketplace: true })
        } else {
          await userStore.login({ username: authStore.user.username, nftmarketplace: true })
        }
      } catch {
        //
      }
    },

    async requestUpdateProfile (data) {
      const { $nftm, $eventBus } = this.$nuxt

      try {
        await $nftm.$post('users/profile', data)

        $eventBus.$emit('nftmarketplace-profile-updated')
      } catch {
        //
      }
    },

    async requestApplyForWhitelist () {
      const { $nftm, $eventBus } = this.$nuxt

      try {
        await $nftm.$post('users/whitelist/apply')

        $eventBus.$emit('nftmarketplace-whitelist-apply-successful')
      } catch {
        //
      }
    },

    requestApplyForAutoWhitelist () {
      const config = useRuntimeConfig().public

      const { amount, symbol } = this.settings.whitelist_payment_requirement

      const json = {
        contractName: 'tokens',
        contractAction: 'transfer',
        contractPayload: {
          symbol,
          to: this.settings.account,
          quantity: amount.toString(),
          memo: JSON.stringify({ action: 'whitelist-apply' })
        }
      }

      const jsonData = {
        id: config.SIDECHAIN_ID,
        keyType: 'Active',
        json,
        message: 'Auto Whitelist Application',
        eventName: 'nftmarketplace-whitelist-apply-successful'
      }

      useTribeStore().requestBroadcastJson(jsonData)
    },

    requestMintTokens ({ fee, payload }) {
      const json = {
        contractName: 'tokens',
        contractAction: 'transfer',
        contractPayload: {
          symbol: this.settings.currency,
          to: this.settings.account,
          quantity: fee.toString(),
          memo: JSON.stringify(payload)
        }
      }

      const jsonData = {
        id: this.settings.sidechain_id,
        keyType: 'Active',
        json,
        message: 'Mint Tokens',
        eventName: 'nftmarketplace-mint-tokens-successful'
      }

      useTribeStore().requestBroadcastJson(jsonData)
    },

    async validateTokenIssuance (trxId) {
      const { $chain, $nftm, $eventBus } = this.$nuxt

      let trx = null
      let count = 0

      do {
        try {
          await $chain.sleep(6 * 1000)

          trx = await $nftm.$get('transactions/find', { params: { trx_id: trxId } })
        } catch {
          //
        }

        count += 1
      } while (!trx && count < 10)

      if (trx) {
        $eventBus.$emit('nftmarketplace-mint-tokens-validated', trx)
      } else {
        $eventBus.$emit('nftmarketplace-mint-tokens-not-validated')
      }
    },

    requestTransfer (recipient) {
      const nfts = this.cart.filter(c => c.account === useAuthStore().user.username && !c.for_sale).map(c => c.nft_id.toString())

      const json = {
        contractName: 'nft',
        contractAction: 'transfer',
        contractPayload: {
          to: recipient,
          nfts: [
            { symbol: this.settings.nft_symbol, ids: nfts }
          ]
        }
      }

      const jsonData = {
        id: this.settings.sidechain_id,
        keyType: 'Active',
        json,
        message: `Transfer NFT (${this.settings.nft_symbol})`,
        eventName: 'nft-multiple-transfer-successful',
        mutation: 'nftmarketplace/EMPTY_CART',
        mutationData: nfts
      }

      useTribeStore().requestBroadcastJson(jsonData)
    },

    async requestTransferMultiple (recipients) {
      const tribeStore = useTribeStore()

      const nfts = this.cart.filter(c => c.account === useAuthStore().user.username && !c.for_sale).map(c => c.nft_id.toString())

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
                { symbol: this.settings.nft_symbol, ids }
              ]
            }
          })
        })

        acc.push({
          id: this.settings.sidechain_id,
          keyType: 'Active',
          json,
          message: `Transfer NFT (${this.settings.nft_symbol})`,
          eventName: 'nft-transfer-successful',
          mutation: 'nftmarketplace/EMPTY_CART',
          mutationData: nftIds.flat(Infinity)
        })

        return acc
      }, [])

      tribeStore.SET_JSON_OPS(ops)

      await tribeStore.requestBroadcastMultipleJson()
    },

    requestSell (price) {
      const nfts = this.cart.filter(c => c.account === useAuthStore().user.username && !c.for_sale).map(c => c.nft_id.toString())

      const json = {
        contractName: 'nftmarket',
        contractAction: 'sell',
        contractPayload: {
          symbol: this.settings.nft_symbol,
          nfts,
          price: price.toString(),
          priceSymbol: this.settings.currency,
          fee: this.settings.market_fee
        }
      }

      const jsonData = {
        id: this.settings.sidechain_id,
        keyType: 'Active',
        json,
        message: `Sell NFT (${this.settings.nft_symbol})`,
        eventName: 'nft-sell-successful',
        mutation: 'nftmarketplace/EMPTY_CART',
        mutationData: nfts
      }

      useTribeStore().requestBroadcastJson(jsonData)
    },

    requestCancelSale () {
      const nfts = this.cart.filter(c => c.for_sale && c.account === useAuthStore().user.username).map(c => c.nft_id.toString())

      const json = {
        contractName: 'nftmarket',
        contractAction: 'cancel',
        contractPayload: {
          symbol: this.settings.nft_symbol,
          nfts
        }
      }

      const jsonData = {
        id: this.settings.sidechain_id,
        keyType: 'Active',
        json,
        message: `Cancel Sale NFT (${this.settings.nft_symbol})`,
        eventName: 'nft-cancel-sell-successful',
        mutation: 'nftmarketplace/EMPTY_CART',
        mutationData: nfts
      }

      useTribeStore().requestBroadcastJson(jsonData)
    },

    requestChangePrice (price) {
      const nfts = this.cart.filter(c => c.for_sale && c.account === useAuthStore().user.username).map(c => c.nft_id.toString())

      const json = {
        contractName: 'nftmarket',
        contractAction: 'changePrice',
        contractPayload: {
          symbol: this.settings.nft_symbol,
          nfts,
          price: price.toString()
        }
      }

      const jsonData = {
        id: this.settings.sidechain_id,
        keyType: 'Active',
        json,
        message: `Change Price NFT (${this.settings.nft_symbol})`,
        eventName: 'nft-change-price-successful',
        mutation: 'nftmarketplace/EMPTY_CART',
        mutationData: nfts
      }

      useTribeStore().requestBroadcastJson(jsonData)
    },

    requestBuy () {
      const nfts = this.cart.filter(c => c.account !== useAuthStore().user.username && c.for_sale && c.price > 0).map(c => c.nft_id.toString())

      const json = {
        contractName: 'nftmarket',
        contractAction: 'buy',
        contractPayload: {
          symbol: this.settings.nft_symbol,
          nfts,
          marketAccount: this.settings.account
        }
      }

      const jsonData = {
        id: this.settings.sidechain_id,
        keyType: 'Active',
        json,
        message: `Buy NFT (${this.settings.nft_symbol})`,
        eventName: 'nft-buy-successful',
        mutation: 'nftmarketplace/EMPTY_CART',
        mutationData: nfts
      }

      useTribeStore().requestBroadcastJson(jsonData)
    },

    requestBurn () {
      const nfts = this.cart.filter(c => c.account === useAuthStore().user.username && !c.for_sale).map(c => c.nft_id.toString())

      const json = {
        contractName: 'nft',
        contractAction: 'burn',
        contractPayload: {
          nfts: [
            { symbol: this.settings.nft_symbol, ids: nfts }
          ]
        }
      }

      const jsonData = {
        id: this.settings.sidechain_id,
        keyType: 'Active',
        json,
        message: `Burn NFT  (${this.settings.nft_symbol})`,
        eventName: 'nft-burn-successful',
        mutation: 'nftmarketplace/EMPTY_CART',
        mutationData: nfts
      }

      useTribeStore().requestBroadcastJson(jsonData)
    },

    requestManageCollectible (data) {
      const jsonData = {
        id: `${this.settings.prefix}_manage_collectible`,
        keyType: 'Active',
        json: { ...data, site: this.settings.site },
        message: 'Manage Collectible',
        eventName: 'manage-collectible-successful',
        emitData: data
      }

      useTribeStore().requestBroadcastJson(jsonData)
    },

    requestManageUser (data) {
      const jsonData = {
        id: `${this.settings.prefix}_manage_user`,
        keyType: 'Active',
        json: { ...data, site: this.settings.site },
        message: 'Manage User',
        eventName: 'manage-user-successful',
        emitData: data
      }

      useTribeStore().requestBroadcastJson(jsonData)
    },

    requestFeatureCollectible (data) {
      const jsonData = {
        id: `${this.settings.prefix}_feature_collectible`,
        keyType: 'Active',
        json: { ...data, site: this.settings.site },
        message: 'Feature Collectible',
        eventName: 'feature-collectible-successful',
        emitData: data
      }

      useTribeStore().requestBroadcastJson(jsonData)
    },

    requestProcessReport (data) {
      const jsonData = {
        id: `${this.settings.prefix}_process_report`,
        keyType: 'Active',
        json: { ...data, site: this.settings.site },
        message: 'Process Report',
        eventName: 'process-report-successful',
        emitData: data
      }

      useTribeStore().requestBroadcastJson(jsonData)
    },

    requestManualIssue (data) {
      const jsonData = {
        id: `${this.settings.prefix}_manual_issue`,
        keyType: 'Active',
        json: { ...data, site: this.settings.site },
        message: 'Manual Issue',
        eventName: 'manual-issue-successful',
        emitData: data
      }

      useTribeStore().requestBroadcastJson(jsonData)
    },

    async requestProcessApplication ({ username, action, value }) {
      const { $nftm, $eventBus } = this.$nuxt

      try {
        const { success } = await $nftm.$post('admin/whitelist', { username, action, value })

        if (success) {
          $eventBus.$emit('process-application-succesful', { username, action, value })
        }
      } catch (e) {
        console.log(e.message)
      }
    },

    requestReportCollectible (data) {
      const jsonData = {
        id: `${this.settings.prefix}_report_collectible`,
        keyType: 'Posting',
        json: { ...data, site: this.settings.site },
        message: 'Report',
        eventName: 'nftmarketplace-report-successful'
      }

      useTribeStore().requestBroadcastJson(jsonData)
    }
  }
})
