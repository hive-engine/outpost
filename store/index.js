import Vue from 'vue'
import { IS_HIVE } from '@/config'
import { encrypt as WCEncrypt, decrypt as WCDecrypt } from '@/utils/web-crypto'
import { decrypt } from '@/utils/triplesec'

const requestKeychain = (fn, ...args) => {
  return new Promise((resolve) => {
    window.hive_keychain[fn](...args, (r) => {
      if (r.error === 'user_cancel') {
        return resolve({ success: false, msg: r.error, cancel: true, ...r })
      }

      if (r.success) {
        return resolve({ success: true, msg: r.result, ...r })
      }

      return resolve({ success: false, msg: r.message, ...r })
    })
  })
}

export const state = () => {
  return {
    tribe_config: null,
    tribe_info: null,
    json_ops: []
  }
}

export const getters = {
  tribe_info: state => state.tribe_info,
  tribe_config: state => state.tribe_config,
  issuer: (state) => {
    const issuer = state.tribe_info.issuer || state.tribe_config.issuer

    return issuer
  },
  muting_account: state => state.tribe_info.issuer
}

export const mutations = {
  SET_TRIBE_CONFIG (state, data) {
    data.author_curve_exponent = Number(data.author_curve_exponent)

    state.tribe_config = data
  },

  SET_TRIBE_INFO (state, data) {
    data = {
      ...data,
      reward_pool: Number(data.reward_pool),
      pending_rshares: Number(data.pending_rshares),
      precision: Number(data.precision)
    }

    state.tribe_info = data
  },

  SET_JSON_OPS (state, data) {
    state.json_ops = data
  }
}

export const actions = {
  async fetchTokenInfoAndConfig ({ commit }) {
    try {
      const [info, config] = await Promise.all([
        this.$scot.$get('info'),
        this.$scot.$get('config')
      ])

      config.vote_regeneration_seconds = Number(config.vote_regeneration_days) * 24 * 60 * 60
      config.downvote_regeneration_seconds = Number(config.downvote_regeneration_days) * 24 * 60 * 60

      commit('SET_TRIBE_INFO', info)
      commit('SET_TRIBE_CONFIG', config)
    } catch (e) {
      console.log(e)
    }
  },

  async nuxtServerInit ({ dispatch }) {
    await dispatch('fetchTokenInfoAndConfig')
  },

  async requestBroadcastMultipleJson ({ commit, state, dispatch }) {
    const { username } = this.$auth.user

    const client = this.$chain.getClient()

    const sentTransactions = []
    let atLeastOneCancelled = false
    let trxCount = 0

    for (let i = 0; i < state.json_ops.length; i += 1) {
      const { id, json, message, keyType, mutation, mutationData } = state.json_ops[i]

      if (this.$auth.user.smartlock) {
        try {
          await dispatch('showConfirmation', { title: message, message: 'Are you sure you want to broadcast this transaction?' })

          const keyTypeLowerCase = keyType.toLocaleLowerCase()

          try {
            let wif = sessionStorage.getItem(`smartlock-${username}-${keyTypeLowerCase}`)

            if (!wif) {
              wif = await dispatch('showUnlockModal', keyTypeLowerCase)
            }

            const key = await WCDecrypt(wif, sessionStorage.getItem('smartlock-otp'))
            const privateKey = this.$chain.PrivateKey.fromString(key)

            const broadcast = await client.broadcast.json({
              required_auths: keyTypeLowerCase === 'active' ? [username] : [],
              required_posting_auths: keyTypeLowerCase === 'posting' ? [username] : [],
              id,
              json: JSON.stringify(json)
            }, privateKey)

            sentTransactions.push(broadcast)

            console.log(broadcast)

            if (mutation) {
              commit(mutation, mutationData)
            }

            trxCount = json.length
          } catch (e) {
            console.log(e.message)

            atLeastOneCancelled = true
          }
        } catch (e) {
          console.log(e)

          atLeastOneCancelled = true
        }
      } else {
        const { success, cancel, result, msg } = await requestKeychain('requestCustomJson', username, id, keyType, JSON.stringify(json), message)

        if (success) {
          console.log(msg)

          sentTransactions.push(result)

          if (mutation) {
            commit(mutation, mutationData)
          }

          trxCount = json.length
        }

        if (cancel) {
          atLeastOneCancelled = true
        }
      }

      await this.$chain.sleep(1000)
    }

    if (atLeastOneCancelled) {
      this.$eventBus.$emit('transaction-broadcast-error', { error: 'Request was canceled by the user.', data: {} })
    }

    if (sentTransactions.length > 0 && state.json_ops.length > 0 && state.json_ops[0].eventName) {
      this.$eventBus.$emit(state.json_ops[0].eventName, { ...sentTransactions.pop(), trx_count: trxCount })
    }

    commit('SET_JSON_OPS', [])
  },

  requestBroadcastJson ({ commit, dispatch }, { id, json, message, eventName, emitData, mutation, mutationData, keyType = 'Posting' }) {
    const { username } = this.$auth.user

    const client = this.$chain.getClient()

    if (this.$auth.user.smartlock) {
      this.$router.app.$root.$bvModal.msgBoxConfirm('Are you sure?', {
        centered: true,
        okVariant: 'success',
        okTitle: 'Yes'
      })
        .then(async (value) => {
          if (value) {
            keyType = keyType.toLocaleLowerCase()

            try {
              let wif = sessionStorage.getItem(`smartlock-${username}-${keyType}`)

              if (!wif) {
                wif = await dispatch('showUnlockModal', keyType)
              }

              const key = await WCDecrypt(wif, sessionStorage.getItem('smartlock-otp'))
              const privateKey = this.$chain.PrivateKey.fromString(key)

              const broadcast = await client.broadcast.json({
                required_auths: keyType === 'active' ? [username] : [],
                required_posting_auths: keyType === 'posting' ? [username] : [],
                id,
                json: JSON.stringify(json)
              }, privateKey)

              console.log(broadcast)

              if (eventName) {
                this.$eventBus.$emit(eventName, emitData || broadcast)
              }

              if (mutation) {
                commit(mutation, mutationData)
              }
            } catch (e) {
              console.log(e.message)

              this.$eventBus.$emit('transaction-broadcast-error', { error: e.message, data: emitData })
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
      window[IS_HIVE ? 'hive_keychain' : 'steem_keychain'].requestCustomJson(username, id, keyType, JSON.stringify(json), message, (r) => {
        if (r.success) {
          console.log(r.result)

          if (eventName) {
            this.$eventBus.$emit(eventName, emitData || r.result)
          }

          if (mutation) {
            commit(mutation, mutationData)
          }
        } else {
          this.$eventBus.$emit('transaction-broadcast-error', { error: r.message, data: emitData })
        }
      })
    }
  },

  requestBroadcastOps ({ commit, dispatch }, { operations, emitEvent, emitData, mutation, mutationData, keyType = 'Posting' }) {
    const { username } = this.$auth.user

    const client = this.$chain.getClient()

    if (this.$auth.user.smartlock) {
      this.$router.app.$root.$bvModal.msgBoxConfirm('Are you sure?', {
        centered: true,
        okVariant: 'success',
        okTitle: 'Yes'
      })
        .then(async (value) => {
          if (value) {
            keyType = keyType.toLocaleLowerCase()

            try {
              let wif = sessionStorage.getItem(`smartlock-${username}-${keyType}`)

              if (!wif) {
                wif = await dispatch('showUnlockModal', keyType)
              }

              const key = await WCDecrypt(wif, sessionStorage.getItem('smartlock-otp'))
              const privateKey = this.$chain.PrivateKey.fromString(key)

              const broadcast = await client.broadcast.sendOperations(operations, privateKey)

              console.log(broadcast)

              if (emitEvent) {
                this.$eventBus.$emit(emitEvent, emitData || broadcast)
              }

              if (mutation) {
                commit(mutation, mutationData)
              }
            } catch (e) {
              console.log(e.message)

              this.$eventBus.$emit('transaction-broadcast-error', { error: e.message, data: emitData })
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
          console.log(r.result)

          if (emitEvent) {
            this.$eventBus.$emit(emitEvent, emitData || r.result)
          }

          if (mutation) {
            commit(mutation, mutationData)
          }
        } else {
          this.$eventBus.$emit('transaction-broadcast-error', { error: r.message, data: emitData })
        }
      })
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
  },

  showUnlockModal (ctx, keyType) {
    const { username } = this.$auth.user
    const h = this.$router.app.$root.$createElement
    let pin = ''

    const messageVNode = h('div', { class: 'text-center' }, [
      h('b-avatar', {
        props: {
          src: `https://images.hive.blog/u/${username}/avatar`,
          size: '100px',
          variant: 'dark'
        },
        class: 'border'
      }),
      h('div', { class: 'font-weight-bold mt-2' }, `@${username}`),
      h('b-form-group', { props: { label: 'Password' }, class: 'mt-3' }, [
        h('pincode-input', { props: { value: pin, length: 5, placeholder: '0', secure: true }, on: { input (event) { pin = event } } })
      ])
    ])

    return new Promise((resolve, reject) => {
      this.$router.app.$root.$bvModal.msgBoxConfirm([messageVNode], {
        size: 'md',
        title: 'Unlock Account',
        noCloseOnBackdrop: true,
        centered: true,
        okVariant: 'primary',
        okTitle: 'Unlock',
        cancelTitle: 'Cancel',
        headerClass: ['justify-content-center'],
        footerClass: ['justify-content-center']
      }).then(async (value) => {
        if (value) {
          try {
            let requestedKey = null
            let accounts = localStorage.getItem('smartlock-accounts')

            accounts = JSON.parse(accounts)

            const account = accounts[username]

            const keys = Object.keys(account)

            for (let i = 0; i < keys.length; i += 1) {
              const key = keys[i]

              const decryptedKey = await decrypt(account[key], pin)

              const storageKey = `smartlock-${username}-${key}`

              const wcEncrypted = await WCEncrypt(decryptedKey, sessionStorage.getItem('smartlock-otp'))

              sessionStorage.setItem(storageKey, wcEncrypted)

              if (key === keyType) {
                requestedKey = wcEncrypted
              }
            }

            return resolve(requestedKey)
          } catch (e) {
            console.log(e.message)
          }
        }

        return reject(new Error('User canceled!'))
      })
        .catch(() => reject(new Error('User canceled!')))
    })
  }
}
