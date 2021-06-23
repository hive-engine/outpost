import Vue from 'vue'
import { IS_HIVE } from '@/config'

export const state = () => {
  return {
    tribe_config: null,
    tribe_info: null
  }
}

export const getters = {
  tribe_info: state => state.tribe_info,
  tribe_config: state => state.tribe_config
}

export const mutations = {
  SET_TRIBE_CONFIG (state, data) {
    state.tribe_config = data
  },

  SET_TRIBE_INFO (state, data) {
    state.tribe_info = data
  }
}

export const actions = {
  async fetchTokenInfoAndConfig ({ commit }) {
    try {
      const [info, config] = await Promise.all([
        this.$scot.$get('info'),
        this.$scot.$get('config')
      ])

      commit('SET_TRIBE_INFO', info)
      commit('SET_TRIBE_CONFIG', config)
    } catch (e) {
      console.log(e)
    }
  },

  async nuxtServerInit ({ dispatch }) {
    await dispatch('fetchTokenInfoAndConfig')
  },

  requestBroadcastOps ({ rootState, commit }, { operations, emitEvent, emitData, mutation, mutationData, keyType = 'Posting' }) {
    const { username } = this.$auth.user

    const client = this.$chain.getClient()

    if (rootState.user.smartlock) {
      this.$router.app.$root.$bvModal.msgBoxConfirm('Are you sure?', {
        centered: true,
        okVariant: 'success',
        okTitle: 'Yes'
      })
        .then(async (value) => {
          if (value) {
            try {
              const wif = localStorage.getItem(`smartlock-${username}`)
              const key = (wif.length > 51) ? atob(wif) : wif
              const privateKey = this.$chain.PrivateKey.fromString(key)

              const broadcast = await client.broadcast.sendOperations(operations, privateKey)

              if (emitEvent) {
                this.$eventBus.$emit(emitEvent, emitData || broadcast)
              }

              if (mutation) {
                commit(mutation, mutationData)
              }
            } catch (e) {
              console.log(e.message)
            }
          } else {
            this.$eventBus.$emit('transaction-broadcast-error', { error: 'Request was canceled by the user.', data: emitData })
          }
        })
        .catch((e) => {
          console.log(e.message)

          this.$eventBus.$emit('transaction-broadcast-error', { error: e.message, data: emitData })
        })
    } else {
      window[IS_HIVE ? 'hive_keychain' : 'steem_keychain'].requestBroadcast(username, operations, keyType, (r) => {
        if (r.success) {
          console.log(r)

          if (emitEvent) {
            this.$eventBus.$emit(emitEvent, emitData || r.result)
          }

          if (mutation) {
            commit(mutation, mutationData)
          }
        } else {
          this.$eventBus.$emit('transaction-broadcast-error', { error: r.message, data: emitData })
        }
      }, true)
    }
  },

  showConfirmation (ctx, { title, message = 'Are you sure?', variant = 'success', okText = 'Yes', cancelText = 'No' }) {
    return new Promise((resolve, reject) => {
      this.$router.app.$root.$bvModal.msgBoxConfirm(message, {
        size: 'lg',
        title,
        centered: true,
        okVariant: variant,
        okTitle: okText,
        cancelTitle: cancelText
      }).then((value) => {
        if (value) {
          return resolve()
        }

        return reject(new Error('User canceled!'))
      })
        .catch(() => reject(new Error('User canceled!')))
    })
  },

  showNotification (ctx, { title, message, type = 'success' }) {
    Vue.notify({
      title,
      type,
      text: message
    })
  }
}
