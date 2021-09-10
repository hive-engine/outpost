import axios from 'axios'

export default ({ $config, store }, inject) => {
  const sidechain = {
    async call (endpoint, request) {
      const rpcNode = $config.SIDECHAIN_RPC

      const postData = {
        jsonrpc: '2.0',
        id: Date.now(),
        ...request
      }

      let result = null

      const query = await axios.post(`${rpcNode}/${endpoint}`, postData, {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      })

      result = query.data.result

      return result
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

      const request = {
        method,
        params: {
          contract: 'tokens',
          table: 'balances',
          query
        }
      }

      return this.contract(request)
    },

    getAccountsBalance (accounts, symbol) {
      const query = { symbol }

      if (Array.isArray(accounts)) {
        query.account = { $in: accounts }
      } else {
        query.account = accounts
      }

      const request = {
        method: 'find',
        params: {
          contract: 'tokens',
          table: 'balances',
          query
        }
      }

      return this.contract(request)
    },

    getContractParams (contractName) {
      const request = {
        method: 'findOne',
        params: {
          contract: contractName,
          table: 'params',
          query: {}
        }
      }

      return this.contract(request)
    },

    getDTFFund (fundId) {
      const request = {
        method: 'findOne',
        params: {
          contract: 'tokenfunds',
          table: 'funds',
          query: { id: fundId }
        }
      }

      return this.contract(request)
    },

    getLiquidityPositions (query = {}, offset = 0, limit = 1000) {
      const request = {
        method: 'find',
        params: {
          contract: 'marketpools',
          table: 'liquidityPositions',
          query,
          offset,
          limit
        }
      }

      return this.contract(request)
    },

    getMetrics (symbol) {
      const query = { symbol }
      let method = 'findOne'

      if (Array.isArray(symbol)) {
        query.symbol = { $in: symbol }
        method = 'find'
      }

      const request = {
        method,
        params: {
          contract: 'market',
          table: 'metrics',
          query
        }
      }

      return this.contract(request)
    },

    getNFTs (query, offset = 0, limit = 1000) {
      const request = {
        method: 'find',
        params: {
          contract: 'nft',
          table: 'nfts',
          query,
          offset,
          limit
        }
      }

      return this.contract(request)
    },

    getNFTSellBook (query, offset = 0, limit = 1000) {
      const symbol = query.symbol || $config.NFT_SYMBOL

      delete query.symbol

      const request = {
        method: 'find',
        params: {
          contract: 'nftmarket',
          table: `${symbol}sellBook`,
          query,
          offset,
          limit
        }
      }

      return this.contract(request)
    },

    getNFTInstances (query, offset = 0, limit = 1000) {
      const symbol = query.symbol || $config.NFT_SYMBOL

      delete query.symbol

      const request = {
        method: 'find',
        params: {
          contract: 'nft',
          table: `${symbol}instances`,
          query,
          offset,
          limit
        }
      }

      return this.contract(request)
    },

    getPendingUnstakes (account, symbol) {
      const request = {
        method: 'find',
        params: {
          contract: 'tokens',
          table: 'pendingUnstakes',
          query: { account, symbol }
        }
      }

      return this.contract(request)
    },

    getDelegations (query, offset = 0, limit = 1000) {
      const request = {
        method: 'find',
        params: {
          contract: 'tokens',
          table: 'delegations',
          query,
          offset,
          limit
        }
      }

      return this.contract(request)
    },

    getDistributions (query, offset = 0, limit = 1000) {
      const request = {
        method: 'find',
        params: {
          contract: 'distribution',
          table: 'batches',
          query,
          offset,
          limit
        }
      }

      return this.contract(request)
    },

    getDTFAccounts (query = {}, offset = 0, limit = 1000) {
      const request = {
        method: 'find',
        params: {
          contract: 'tokenfunds',
          table: 'accounts',
          query,
          offset,
          limit
        }
      }

      return this.contract(request)
    },

    getDTFApprovals (query = {}, offset = 0, limit = 1000) {
      const request = {
        method: 'find',
        params: {
          contract: 'tokenfunds',
          table: 'approvals',
          query,
          offset,
          limit
        }
      }

      return this.contract(request)
    },

    getDTFFunds (query = {}, offset = 0, limit = 1000) {
      const request = {
        method: 'find',
        params: {
          contract: 'tokenfunds',
          table: 'funds',
          query,
          offset,
          limit
        }
      }

      return this.contract(request)
    },

    getDTFProposals (query, offset = 0, limit = 1000) {
      const request = {
        method: 'find',
        params: {
          contract: 'tokenfunds',
          table: 'proposals',
          query,
          offset,
          limit
        }
      }

      return this.contract(request)
    },

    getMarketPools (query, offset = 0, limit = 1000) {
      const request = {
        method: 'find',
        params: {
          contract: 'marketpools',
          table: 'pools',
          query,
          offset,
          limit
        }
      }

      return this.contract(request)
    },

    getMiningPools (query, offset = 0, limit = 1000) {
      const request = {
        method: 'find',
        params: {
          contract: 'mining',
          table: 'pools',
          query,
          offset,
          limit
        }
      }

      return this.contract(request)
    },

    getSMTRewardPool (symbol) {
      const request = {
        method: 'findOne',
        params: {
          contract: 'comments',
          table: 'rewardPools',
          query: { symbol }
        }
      }

      return this.contract(request)
    },

    getTokens (query = {}, offset = 0, limit = 1000) {
      const request = {
        method: 'find',
        params: {
          contract: 'tokens',
          table: 'tokens',
          query,
          offset,
          limit
        }
      }

      return this.contract(request)
    },

    getTransaction (txid) {
      const request = {
        method: 'getTransactionInfo',
        params: {
          txid
        }
      }

      return this.blockchain(request)
    },

    getVotingPower (account, rewardPoolId = store.state.tribe_config.reward_pool_id) {
      const request = {
        method: 'findOne',
        params: {
          contract: 'comments',
          table: 'votingPower',
          query: { account, rewardPoolId }
        }
      }

      return this.contract(request)
    }
  }

  inject('sidechain', sidechain)
}
