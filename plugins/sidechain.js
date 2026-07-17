// Hive-Engine sidechain RPC — ported from legacy/plugins/sidechain.js.
// Differences from legacy: defineNuxtPlugin/provide, cleanError guard (SSR-safe
// errors), and the store lookup in getVotingPower uses the Pinia tribe store.
import axios from 'axios'
import { cleanError } from '~/utils/clean-error'
import { useTribeStore } from '~/stores/tribe'

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig().public

  const sidechain = {
    async call (endpoint, request) {
      const rpcNode = config.SIDECHAIN_RPC

      const postData = {
        jsonrpc: '2.0',
        id: Date.now(),
        ...request
      }

      let query

      try {
        query = await axios.post(`${rpcNode}/${endpoint}`, postData, {
          headers: { 'Content-Type': 'application/json' }
        })
      } catch (error) {
        throw cleanError(error)
      }

      return query.data.result
    },

    blockchain (request) {
      return this.call('blockchain', request)
    },

    contract (request) {
      return this.call('contracts', request)
    },

    getBalance (account, symbol) {
      const query = { account }
      let method = 'findOne'

      if (Array.isArray(symbol)) {
        method = 'find'
        query.symbol = { $in: symbol }
      } else {
        query.symbol = symbol
      }

      return this.contract({ method, params: { contract: 'tokens', table: 'balances', query } })
    },

    getAccountsBalance (accounts, symbol) {
      const query = { symbol }

      if (Array.isArray(accounts)) {
        query.account = { $in: accounts }
      } else {
        query.account = accounts
      }

      return this.contract({ method: 'find', params: { contract: 'tokens', table: 'balances', query } })
    },

    getContractParams (contractName) {
      return this.contract({ method: 'findOne', params: { contract: contractName, table: 'params', query: {} } })
    },

    getDTFFund (fundId) {
      return this.contract({ method: 'findOne', params: { contract: 'tokenfunds', table: 'funds', query: { id: fundId } } })
    },

    getLiquidityPositions (query = {}, offset = 0, limit = 1000) {
      return this.contract({ method: 'find', params: { contract: 'marketpools', table: 'liquidityPositions', query, offset, limit } })
    },

    getMetrics (symbol) {
      const query = { symbol }
      let method = 'findOne'

      if (Array.isArray(symbol)) {
        query.symbol = { $in: symbol }
        method = 'find'
      }

      return this.contract({ method, params: { contract: 'market', table: 'metrics', query } })
    },

    getNFTs (query, offset = 0, limit = 1000) {
      return this.contract({ method: 'find', params: { contract: 'nft', table: 'nfts', query, offset, limit } })
    },

    getNFTSellBook (query, offset = 0, limit = 1000) {
      const symbol = query.symbol || config.NFT_SYMBOL

      delete query.symbol

      return this.contract({ method: 'find', params: { contract: 'nftmarket', table: `${symbol}sellBook`, query, offset, limit } })
    },

    getNFTInstances (query, offset = 0, limit = 1000) {
      const symbol = query.symbol || config.NFT_SYMBOL

      delete query.symbol

      return this.contract({ method: 'find', params: { contract: 'nft', table: `${symbol}instances`, query, offset, limit } })
    },

    getPendingUnstakes (account, symbol) {
      return this.contract({ method: 'find', params: { contract: 'tokens', table: 'pendingUnstakes', query: { account, symbol } } })
    },

    getDelegations (query, offset = 0, limit = 1000) {
      return this.contract({ method: 'find', params: { contract: 'tokens', table: 'delegations', query, offset, limit } })
    },

    getDistributions (query, offset = 0, limit = 1000) {
      return this.contract({ method: 'find', params: { contract: 'distribution', table: 'batches', query, offset, limit } })
    },

    getDTFAccounts (query = {}, offset = 0, limit = 1000) {
      return this.contract({ method: 'find', params: { contract: 'tokenfunds', table: 'accounts', query, offset, limit } })
    },

    getDTFApprovals (query = {}, offset = 0, limit = 1000) {
      return this.contract({ method: 'find', params: { contract: 'tokenfunds', table: 'approvals', query, offset, limit } })
    },

    getDTFFunds (query = {}, offset = 0, limit = 1000) {
      return this.contract({ method: 'find', params: { contract: 'tokenfunds', table: 'funds', query, offset, limit } })
    },

    getDTFProposals (query, offset = 0, limit = 1000) {
      return this.contract({ method: 'find', params: { contract: 'tokenfunds', table: 'proposals', query, offset, limit } })
    },

    getMarketPools (query, offset = 0, limit = 1000) {
      return this.contract({ method: 'find', params: { contract: 'marketpools', table: 'pools', query, offset, limit } })
    },

    getMiningPools (query, offset = 0, limit = 1000) {
      return this.contract({ method: 'find', params: { contract: 'mining', table: 'pools', query, offset, limit } })
    },

    getSMTRewardPool (symbol) {
      return this.contract({ method: 'findOne', params: { contract: 'comments', table: 'rewardPools', query: { symbol } } })
    },

    getTokens (query = {}, offset = 0, limit = 1000) {
      return this.contract({ method: 'find', params: { contract: 'tokens', table: 'tokens', query, offset, limit } })
    },

    getTransaction (txid) {
      return this.blockchain({ method: 'getTransactionInfo', params: { txid } })
    },

    getVotingPower (account, rewardPoolId) {
      // Default comes from the tribe store (legacy read store.state.tribe_config).
      // Looked up lazily so plugin init order doesn't matter.
      if (rewardPoolId === undefined) {
        const tribe = useTribeStore()
        rewardPoolId = tribe.tribe_config?.reward_pool_id
      }

      return this.contract({ method: 'findOne', params: { contract: 'comments', table: 'votingPower', query: { account, rewardPoolId } } })
    }
  }

  return {
    provide: {
      sidechain
    }
  }
})
