const arrayChunk = (array, size = 10) => {
  const chunkedArray = []
  let index = 0

  while (index < array.length) {
    chunkedArray.push(array.slice(index, size + index))
    index += size
  }

  return chunkedArray
}

export const state = () => {
  return {
    fund: null,
    proposals: [],
    approval_weight: 0
  }
}

export const getters = {
  fund: state => state.fund,
  proposals: state => state.proposals,
  approval_weight: state => state.approval_weight
}

export const mutations = {
  SET_FUND (state, data) {
    state.fund = data
  },

  SET_PROPOSALS (state, data) {
    state.proposals = data
  },

  SET_APPROVAL_WEIGHT (state, data) {
    state.approval_weight = data
  }
}

export const actions = {
  async fetchFund ({ commit }) {
    try {
      const fund = await this.$sidechain.getDTFFund(this.$config.DTF_ID)

      commit('SET_FUND', fund)
    } catch {
      //
    }
  },

  async fetchProposals ({ commit, state }, query) {
    try {
      const limit = 1000
      const results = []
      let newData = 0
      let offset = 0

      do {
        const data = await this.$sidechain.getDTFProposals({ fundId: state.fund.id, ...query }, offset, limit)
        newData = data.length

        if (data.length > 0) {
          results.push(...data)

          if (data.length < limit) {
            newData = 0
          }
        }
        offset += 1000
      } while (newData > 0)

      commit('SET_PROPOSALS', results)
    } catch {
      //
    }
  },

  async fetchApprovals (_, query = {}) {
    const limit = 1000
    const results = []
    let newData = 0
    let offset = 0

    do {
      const data = await this.$sidechain.getDTFApprovals(query, offset, limit)
      newData = data.length

      if (data.length > 0) {
        results.push(...data)

        if (data.length < limit) {
          newData = 0
        }
      }
      offset += limit
    } while (newData > 0)

    return results
  },

  async fetchProposalApprovals ({ dispatch }, { id, fundId }) {
    const approvals = await dispatch('fetchApprovals', { to: id })

    const approvers = arrayChunk(approvals.map(a => a.from), 1000)

    const requests = approvers.map(chunk => this.$sidechain.getDTFAccounts({ '_id.account': { $in: chunk } }))

    let accountWeights = await Promise.all(requests)

    accountWeights = accountWeights.flat()

    const [, voteToken] = fundId.split(':')

    accountWeights = accountWeights.map(({ account, weights }) => {
      const symbol = weights.find(w => w.symbol === voteToken)

      return {
        account,
        approvalWeight: symbol ? Number(symbol.weight) : 0,
        symbol: voteToken
      }
    })
      .sort((a, b) => b.approvalWeight - a.approvalWeight)

    return accountWeights
  },

  async fetchApprovalWeight ({ commit, state }) {
    const [account] = await this.$sidechain.getDTFAccounts({ account: this.$auth.user.username })

    let weight = 0

    if (account) {
      const [, voteToken] = state.fund.id.split(':')

      const symbol = account.weights.find(w => w.symbol === voteToken)

      weight = symbol ? Number(symbol.weight) : 0
    }

    commit('SET_APPROVAL_WEIGHT', weight)
  },

  async fetchTokens () {
    const limit = 1000
    const results = []
    let newData = 0
    let offset = 0

    do {
      const data = await this.$sidechain.getTokens({}, offset, limit)
      newData = data.length

      if (data.length > 0) {
        results.push(...data)

        if (data.length < limit) {
          newData = 0
        }
      }
      offset += limit
    } while (newData > 0)

    return results
  },

  requestCreateProposal ({ dispatch }, payload) {
    const json = {
      contractName: 'tokenfunds',
      contractAction: 'createProposal',
      contractPayload: payload
    }

    const jsonData = {
      id: this.$config.SIDECHAIN_ID,
      keyType: 'Active',
      json,
      message: `Create Proposal (${payload.fundId})`,
      eventName: 'dao-proposal-creation-successful'
    }

    dispatch('requestBroadcastJson', jsonData, { root: true })
  },

  requestUpdateProposal ({ dispatch }, payload) {
    const json = {
      contractName: 'tokenfunds',
      contractAction: 'updateProposal',
      contractPayload: payload
    }

    const jsonData = {
      id: this.$config.SIDECHAIN_ID,
      keyType: 'Active',
      json,
      message: `Update Proposal #${payload.id}`,
      eventName: 'dao-proposal-update-successful'
    }

    dispatch('requestBroadcastJson', jsonData, { root: true })
  },

  requestApproveProposal ({ dispatch }, { id, approve }) {
    const json = {
      contractName: 'tokenfunds',
      contractAction: approve ? 'approveProposal' : 'disapproveProposal',
      contractPayload: {
        id: id.toString()
      }
    }

    const jsonData = {
      id: this.$config.SIDECHAIN_ID,
      keyType: 'Active',
      json,
      message: `${approve ? 'Approve' : 'Disapprove'} Proposal #${id}`,
      eventName: 'dao-proposal-approve-successful'
    }

    dispatch('requestBroadcastJson', jsonData, { root: true })
  },

  requestDisableProposal ({ dispatch }, id) {
    const json = {
      contractName: 'tokenfunds',
      contractAction: 'disableProposal',
      contractPayload: {
        id: id.toString()
      }
    }

    const jsonData = {
      id: this.$config.SIDECHAIN_ID,
      keyType: 'Active',
      json,
      message: `Disable Proposal #${id}`,
      eventName: 'dao-proposal-disable-successful'
    }

    dispatch('requestBroadcastJson', jsonData, { root: true })
  },

  requestUpdateFund ({ dispatch }, payload) {
    const json = {
      contractName: 'tokenfunds',
      contractAction: 'updateFund',
      contractPayload: payload
    }

    const jsonData = {
      id: this.$config.SIDECHAIN_ID,
      keyType: 'Active',
      json,
      message: `Update Fund (${payload.fundId})`,
      eventName: 'dao-update-successful'
    }

    dispatch('requestBroadcastJson', jsonData, { root: true })
  },

  requestFundActivation ({ state, dispatch }, active) {
    const json = {
      contractName: 'tokenfunds',
      contractAction: 'setDtfActive',
      contractPayload: {
        fundId: state.fund.id,
        active
      }
    }

    const jsonData = {
      id: this.$config.SIDECHAIN_ID,
      keyType: 'Active',
      json,
      message: `${active ? 'Activate' : 'Deactivate'} Fund`,
      eventName: 'dao-activation-successful'
    }

    dispatch('requestBroadcastJson', jsonData, { root: true })
  }
}
