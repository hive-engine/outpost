export const state = () => {
  return {
    fund: {},
    proposal: {},
    distribution: {},
    smt: {},
    pool: {}
  }
}

export const getters = {
  fund: state => state.fund,
  proposal: state => state.proposal,
  distribution: state => state.distribution,
  smt: state => state.smt,
  pool: state => state.pool
}

export const mutations = {
  REQUEST_EDIT (state, { type, payload }) {
    switch (type) {
      case 'smt':
        state.smt = payload

        this.$router.app.$root.$bvModal.show('manageSMTModal')

        break

      case 'pool':
        state.pool = payload

        this.$router.app.$root.$bvModal.show('manageMiningPoolModal')

        break

      case 'fund':
        state.fund = payload

        this.$router.app.$root.$bvModal.show('updateDaoModal')

        break

      case 'distribution':
        state.distribution = payload

        this.$router.app.$root.$bvModal.show('updateDistributionModal')

        break

      case 'proposal':
        state.proposal = payload

        this.$router.app.$root.$bvModal.show('updateProposalModal')

        break

      default:
    }
  },

  REQUEST_CREATE_PROPOSAL (state, payload) {
    state.fund = payload

    this.$router.app.$root.$bvModal.show('createProposalModal')
  }
}

export const actions = {
  async requestActivate ({ dispatch }, { type, id, active }) {
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
        id: this.$config.SIDECHAIN_ID,
        keyType: 'Active',
        json,
        message,
        eventName
      }

      await dispatch('showConfirmation', { title: confirmTitle, message: confirmMessage }, { root: true })

      dispatch('requestBroadcastJson', jsonData, { root: true })
    } catch {
      //
    }
  },

  async fetchMarketPools () {
    const limit = 1000
    const results = []
    let newData = 0
    let offset = 0

    do {
      const data = await this.$sidechain.getMarketPools({}, offset, limit)
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
