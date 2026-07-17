import { defineStore } from 'pinia'
import { useTribeStore } from '~/stores/tribe'
import { useAuthStore } from '~/stores/auth'

const arrayChunk = (array, size = 10) => {
  const chunkedArray = []
  let index = 0

  while (index < array.length) {
    chunkedArray.push(array.slice(index, size + index))
    index += size
  }

  return chunkedArray
}

// Identity getters from the Vuex module (fund, proposals, approval_weight) are
// dropped — Pinia exposes state directly under the same names.
export const useDaoStore = defineStore('dao', {
  state: () => ({
    fund: null,
    proposals: [],
    approval_weight: 0
  }),

  actions: {
    SET_FUND (data) {
      this.fund = data
    },

    SET_PROPOSALS (data) {
      this.proposals = data
    },

    SET_APPROVAL_WEIGHT (data) {
      this.approval_weight = data
    },

    async fetchFund () {
      const { $sidechain } = useNuxtApp()
      const config = useRuntimeConfig().public

      try {
        const fund = await $sidechain.getDTFFund(config.DTF_ID)

        this.SET_FUND(fund)
      } catch {
        //
      }
    },

    async fetchProposals (query) {
      const { $sidechain } = useNuxtApp()

      try {
        const limit = 1000
        const results = []
        let newData = 0
        let offset = 0

        do {
          const data = await $sidechain.getDTFProposals({ fundId: this.fund.id, ...query }, offset, limit)
          newData = data.length

          if (data.length > 0) {
            results.push(...data)

            if (data.length < limit) {
              newData = 0
            }
          }
          offset += 1000
        } while (newData > 0)

        this.SET_PROPOSALS(results)
      } catch {
        //
      }
    },

    async fetchApprovals (query = {}) {
      const { $sidechain } = useNuxtApp()

      const limit = 1000
      const results = []
      let newData = 0
      let offset = 0

      do {
        const data = await $sidechain.getDTFApprovals(query, offset, limit)
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

    async fetchProposalApprovals ({ id, fundId }) {
      const { $sidechain } = useNuxtApp()

      const approvals = await this.fetchApprovals({ to: id })

      const approvers = arrayChunk(approvals.map(a => a.from), 1000)

      const requests = approvers.map(chunk => $sidechain.getDTFAccounts({ '_id.account': { $in: chunk } }))

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

    async fetchApprovalWeight () {
      const { $sidechain } = useNuxtApp()

      const [account] = await $sidechain.getDTFAccounts({ account: useAuthStore().user.username })

      let weight = 0

      if (account) {
        const [, voteToken] = this.fund.id.split(':')

        const symbol = account.weights.find(w => w.symbol === voteToken)

        weight = symbol ? Number(symbol.weight) : 0
      }

      this.SET_APPROVAL_WEIGHT(weight)
    },

    async fetchTokens () {
      const { $sidechain } = useNuxtApp()

      const limit = 1000
      const results = []
      let newData = 0
      let offset = 0

      do {
        const data = await $sidechain.getTokens({}, offset, limit)
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

    requestCreateProposal (payload) {
      const config = useRuntimeConfig().public

      const json = {
        contractName: 'tokenfunds',
        contractAction: 'createProposal',
        contractPayload: payload
      }

      const jsonData = {
        id: config.SIDECHAIN_ID,
        keyType: 'Active',
        json,
        message: `Create Proposal (${payload.fundId})`,
        eventName: 'dao-proposal-creation-successful'
      }

      useTribeStore().requestBroadcastJson(jsonData)
    },

    requestUpdateProposal (payload) {
      const config = useRuntimeConfig().public

      const json = {
        contractName: 'tokenfunds',
        contractAction: 'updateProposal',
        contractPayload: payload
      }

      const jsonData = {
        id: config.SIDECHAIN_ID,
        keyType: 'Active',
        json,
        message: `Update Proposal #${payload.id}`,
        eventName: 'dao-proposal-update-successful'
      }

      useTribeStore().requestBroadcastJson(jsonData)
    },

    requestApproveProposal ({ id, approve }) {
      const config = useRuntimeConfig().public

      const json = {
        contractName: 'tokenfunds',
        contractAction: approve ? 'approveProposal' : 'disapproveProposal',
        contractPayload: {
          id: id.toString()
        }
      }

      const jsonData = {
        id: config.SIDECHAIN_ID,
        keyType: 'Active',
        json,
        message: `${approve ? 'Approve' : 'Disapprove'} Proposal #${id}`,
        eventName: 'dao-proposal-approve-successful'
      }

      useTribeStore().requestBroadcastJson(jsonData)
    },

    requestDisableProposal (id) {
      const config = useRuntimeConfig().public

      const json = {
        contractName: 'tokenfunds',
        contractAction: 'disableProposal',
        contractPayload: {
          id: id.toString()
        }
      }

      const jsonData = {
        id: config.SIDECHAIN_ID,
        keyType: 'Active',
        json,
        message: `Disable Proposal #${id}`,
        eventName: 'dao-proposal-disable-successful'
      }

      useTribeStore().requestBroadcastJson(jsonData)
    },

    requestUpdateFund (payload) {
      const config = useRuntimeConfig().public

      const json = {
        contractName: 'tokenfunds',
        contractAction: 'updateFund',
        contractPayload: payload
      }

      const jsonData = {
        id: config.SIDECHAIN_ID,
        keyType: 'Active',
        json,
        message: `Update Fund (${payload.fundId})`,
        eventName: 'dao-update-successful'
      }

      useTribeStore().requestBroadcastJson(jsonData)
    },

    requestFundActivation (active) {
      const config = useRuntimeConfig().public

      const json = {
        contractName: 'tokenfunds',
        contractAction: 'setDtfActive',
        contractPayload: {
          fundId: this.fund.id,
          active
        }
      }

      const jsonData = {
        id: config.SIDECHAIN_ID,
        keyType: 'Active',
        json,
        message: `${active ? 'Activate' : 'Deactivate'} Fund`,
        eventName: 'dao-activation-successful'
      }

      useTribeStore().requestBroadcastJson(jsonData)
    }
  }
})
