import axios from 'axios'

export default ({ $config }, inject) => {
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

    getTransaction (txid) {
      const request = {
        method: 'getTransactionInfo',
        params: {
          txid
        }
      }

      return this.blockchain(request)
    }
  }

  inject('sidechain', sidechain)
}
