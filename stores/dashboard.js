import { defineStore } from 'pinia'
import { useTribeStore } from '~/stores/tribe'
import { useUiStore } from '~/stores/ui'

// Identity getters from the Vuex module (fund, proposal, distribution, smt, pool)
// are dropped — Pinia exposes state directly under the same names.
export const useDashboardStore = defineStore('dashboard', {
  state: () => ({
    fund: {},
    proposal: {},
    distribution: {},
    smt: {},
    pool: {}
  }),

  actions: {
    REQUEST_EDIT ({ type, payload }) {
      const ui = useUiStore()

      const modalByType = {
        smt: 'manageSMTModal',
        pool: 'manageMiningPoolModal',
        fund: 'updateDaoModal',
        distribution: 'updateDistributionModal',
        proposal: 'updateProposalModal'
      }

      if (type in this.$state) { this[type] = payload }

      const modalId = modalByType[type]
      if (modalId) { ui.showModal(modalId) }
    },

    REQUEST_CREATE_PROPOSAL (payload) {
      this.fund = payload
      useUiStore().showModal('createProposalModal')
    },

    async requestActivate ({ type, id, active }) {
      const config = useRuntimeConfig().public
      const tribeStore = useTribeStore()

      try {
        let json = {}
        let message = ''
        let eventName = ''

        let confirmTitle = ''
        let confirmMessage = ''

        switch (type) {
          case 'smt':
            confirmTitle = `${active ? 'Activate' : 'Deactivate'} SMT Reward Pool`
            confirmMessage = `Are you sure you want to ${active ? 'activate' : 'deactivate'} SMT reward pool?`

            json = {
              contractName: 'comments',
              contractAction: 'setActive',
              contractPayload: {
                rewardPoolId: id,
                active
              }
            }

            message = `${active ? 'Activate' : 'Deactivate'} Pool`
            eventName = 'smt-reward-pool-activation-successful'

            break

          case 'mining':
            confirmTitle = `${active ? 'Activate' : 'Deactivate'} Mining Reward Pool`
            confirmMessage = `Are you sure you want to ${active ? 'activate' : 'deactivate'} Mining reward pool ${id}?`

            json = {
              contractName: 'mining',
              contractAction: 'setActive',
              contractPayload: {
                id,
                active
              }
            }

            message = `${active ? 'Activate' : 'Deactivate'} Pool`
            eventName = 'mining-pool-activation-successful'

            break

          case 'fund':
            confirmTitle = `${active ? 'Activate' : 'Deactivate'} DAO`
            confirmMessage = `Are you sure you want to ${active ? 'activate' : 'deactivate'} DAO ${id}?`

            json = {
              contractName: 'tokenfunds',
              contractAction: 'setDtfActive',
              contractPayload: {
                fundId: id,
                active
              }
            }

            message = `${active ? 'Activate' : 'Deactivate'} DAO`
            eventName = 'dao-activation-successful'

            break

          case 'distribution':
            confirmTitle = `${active ? 'Activate' : 'Deactivate'} Distribution`
            confirmMessage = `Are you sure you want to ${active ? 'activate' : 'deactivate'} Distribution #${id}?`

            json = {
              contractName: 'distribution',
              contractAction: 'setActive',
              contractPayload: {
                id,
                active
              }
            }

            message = `${active ? 'Activate' : 'Deactivate'} Distribution`
            eventName = 'distribution-activation-successful'

            break

          case 'proposal':
            confirmTitle = `Permanently ${active ? 'Activate' : 'Deactivate'} Proposal`
            confirmMessage = `Are you sure you want to permanently ${active ? 'activate' : 'deactivate'} Proposal #${id}?`

            json = {
              contractName: 'tokenfunds',
              contractAction: 'disableProposal',
              contractPayload: {
                id: id.toString()
              }
            }

            message = `${active ? 'Activate' : 'Deactivate'} Proposal`
            eventName = 'dao-proposal-activation-successful'

            break

          default:
        }

        const jsonData = {
          id: config.SIDECHAIN_ID,
          keyType: 'Active',
          json,
          message,
          eventName
        }

        await tribeStore.showConfirmation({ title: confirmTitle, message: confirmMessage })

        tribeStore.requestBroadcastJson(jsonData)
      } catch {
        //
      }
    },

    async fetchMarketPools () {
      const { $sidechain } = this.$nuxt

      const limit = 1000
      const results = []
      let newData = 0
      let offset = 0

      do {
        const data = await $sidechain.getMarketPools({}, offset, limit)
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
    }
  }
})
