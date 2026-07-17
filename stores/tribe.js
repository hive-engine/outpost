// Ported from legacy/store/index.js (Vuex root module) → Pinia 'tribe' store.
import { defineStore } from 'pinia'
import { IS_HIVE } from '~/config'
import { encrypt as WCEncrypt, decrypt as WCDecrypt } from '~/utils/web-crypto'
import { decrypt } from '~/utils/triplesec'
import { useAuthStore } from '~/stores/auth'
import { useUserStore } from '~/stores/user'
import { useNftMarketplaceStore } from '~/stores/nftmarketplace'

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

// Legacy Vuex allowed passing (possibly namespaced) mutation names into the broadcast
// actions (e.g. 'user/UPDATE_FOLLOWING', 'nftmarketplace/EMPTY_CART'). Resolve them to
// the equivalent Pinia store action.
const commitMutation = (store, mutation, data) => {
  if (mutation.includes('/')) {
    const [ns, name] = mutation.split('/')
    const namespaces = {
      user: useUserStore,
      nftmarketplace: useNftMarketplaceStore
    }

    return namespaces[ns]()[name](data)
  }

  return store[mutation](data)
}

export const useTribeStore = defineStore('tribe', {
  state: () => {
    return {
      tribe_config: null,
      tribe_info: null,
      json_ops: []
    }
  },

  getters: {
    // Legacy mirror getters (tribe_info, tribe_config) dropped — in Pinia a getter can't
    // share a name with a state property; state is accessed directly instead.
    issuer: (state) => {
      const issuer = state.tribe_info.issuer || state.tribe_config.issuer

      return issuer
    },
    muting_account: state => state.tribe_info.issuer
  },

  actions: {
    SET_TRIBE_CONFIG (data) {
      data.author_curve_exponent = Number(data.author_curve_exponent)

      this.tribe_config = data
    },

    SET_TRIBE_INFO (data) {
      data = {
        ...data,
        reward_pool: Number(data.reward_pool),
        pending_rshares: Number(data.pending_rshares),
        precision: Number(data.precision)
      }

      this.tribe_info = data
    },

    SET_JSON_OPS (data) {
      this.json_ops = data
    },

    async fetchTokenInfoAndConfig () {
      const { $scot } = useNuxtApp()

      try {
        const [info, config] = await Promise.all([
          $scot.$get('info'),
          $scot.$get('config')
        ])

        config.vote_regeneration_seconds = Number(config.vote_regeneration_days) * 24 * 60 * 60
        config.downvote_regeneration_seconds = Number(config.downvote_regeneration_days) * 24 * 60 * 60

        this.SET_TRIBE_INFO(info)
        this.SET_TRIBE_CONFIG(config)
      } catch (e) {
        console.log(e)
      }
    },

    // Called from app.vue on startup (replaces nuxtServerInit)
    async init () {
      await this.fetchTokenInfoAndConfig()
    },

    async requestBroadcastMultipleJson () {
      const { $chain, $eventBus } = useNuxtApp()
      const authStore = useAuthStore()

      const { username } = authStore.user

      const client = $chain.getClient()

      const sentTransactions = []
      let atLeastOneCancelled = false
      let trxCount = 0

      for (let i = 0; i < this.json_ops.length; i += 1) {
        const { id, json, message, keyType, mutation, mutationData } = this.json_ops[i]

        if (authStore.user.smartlock) {
          try {
            await this.showConfirmation({ title: message, message: 'Are you sure you want to broadcast this transaction?' })

            const keyTypeLowerCase = keyType.toLocaleLowerCase()

            try {
              let wif = sessionStorage.getItem(`smartlock-${username}-${keyTypeLowerCase}`)

              if (!wif) {
                wif = await this.showUnlockModal(keyTypeLowerCase)
              }

              const key = await WCDecrypt(wif, sessionStorage.getItem('smartlock-otp'))
              const privateKey = $chain.PrivateKey.fromString(key)

              const broadcast = await client.broadcast.json({
                required_auths: keyTypeLowerCase === 'active' ? [username] : [],
                required_posting_auths: keyTypeLowerCase === 'posting' ? [username] : [],
                id,
                json: JSON.stringify(json)
              }, privateKey)

              sentTransactions.push(broadcast)

              console.log(broadcast)

              if (mutation) {
                commitMutation(this, mutation, mutationData)
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
              commitMutation(this, mutation, mutationData)
            }

            trxCount = json.length
          }

          if (cancel) {
            atLeastOneCancelled = true
          }
        }

        await $chain.sleep(1000)
      }

      if (atLeastOneCancelled) {
        $eventBus.$emit('transaction-broadcast-error', { error: 'Request was canceled by the user.', data: {} })
      }

      if (sentTransactions.length > 0 && this.json_ops.length > 0 && this.json_ops[0].eventName) {
        $eventBus.$emit(this.json_ops[0].eventName, { ...sentTransactions.pop(), trx_count: trxCount })
      }

      this.SET_JSON_OPS([])
    },

    requestBroadcastJson ({ id, json, message, eventName, emitData, mutation, mutationData, keyType = 'Posting' }) {
      const { $chain, $eventBus } = useNuxtApp()
      const authStore = useAuthStore()

      const { username } = authStore.user

      const client = $chain.getClient()

      if (authStore.user.smartlock) {
        $eventBus.$emit('show-modal', 'broadcast-confirm') // TODO(P3): wire modal

        // TODO(P3): wire modal — was $bvModal.msgBoxConfirm('Are you sure?'); auto-confirms for now
        Promise.resolve(true)
          .then(async (value) => {
            if (value) {
              keyType = keyType.toLocaleLowerCase()

              try {
                let wif = sessionStorage.getItem(`smartlock-${username}-${keyType}`)

                if (!wif) {
                  wif = await this.showUnlockModal(keyType)
                }

                const key = await WCDecrypt(wif, sessionStorage.getItem('smartlock-otp'))
                const privateKey = $chain.PrivateKey.fromString(key)

                const broadcast = await client.broadcast.json({
                  required_auths: keyType === 'active' ? [username] : [],
                  required_posting_auths: keyType === 'posting' ? [username] : [],
                  id,
                  json: JSON.stringify(json)
                }, privateKey)

                console.log(broadcast)

                if (eventName) {
                  $eventBus.$emit(eventName, emitData || broadcast)
                }

                if (mutation) {
                  commitMutation(this, mutation, mutationData)
                }
              } catch (e) {
                console.log(e.message)

                $eventBus.$emit('transaction-broadcast-error', { error: e.message, data: emitData })
              }
            } else {
              $eventBus.$emit('transaction-broadcast-error', { error: 'Request was canceled by the user.', data: emitData })
            }
          })
          .catch((e) => {
            console.log(e.message)

            $eventBus.$emit('transaction-broadcast-error', { error: e.message, data: emitData })
          })
      } else {
        window[IS_HIVE ? 'hive_keychain' : 'steem_keychain'].requestCustomJson(username, id, keyType, JSON.stringify(json), message, (r) => {
          if (r.success) {
            console.log(r.result)

            if (eventName) {
              $eventBus.$emit(eventName, emitData || r.result)
            }

            if (mutation) {
              commitMutation(this, mutation, mutationData)
            }
          } else {
            $eventBus.$emit('transaction-broadcast-error', { error: r.message, data: emitData })
          }
        })
      }
    },

    requestBroadcastOps ({ operations, emitEvent, emitData, mutation, mutationData, keyType = 'Posting' }) {
      const { $chain, $eventBus } = useNuxtApp()
      const authStore = useAuthStore()

      const { username } = authStore.user

      const client = $chain.getClient()

      if (authStore.user.smartlock) {
        $eventBus.$emit('show-modal', 'broadcast-confirm') // TODO(P3): wire modal

        // TODO(P3): wire modal — was $bvModal.msgBoxConfirm('Are you sure?'); auto-confirms for now
        Promise.resolve(true)
          .then(async (value) => {
            if (value) {
              keyType = keyType.toLocaleLowerCase()

              try {
                let wif = sessionStorage.getItem(`smartlock-${username}-${keyType}`)

                if (!wif) {
                  wif = await this.showUnlockModal(keyType)
                }

                const key = await WCDecrypt(wif, sessionStorage.getItem('smartlock-otp'))
                const privateKey = $chain.PrivateKey.fromString(key)

                const broadcast = await client.broadcast.sendOperations(operations, privateKey)

                console.log(broadcast)

                if (emitEvent) {
                  $eventBus.$emit(emitEvent, emitData || broadcast)
                }

                if (mutation) {
                  commitMutation(this, mutation, mutationData)
                }
              } catch (e) {
                console.log(e.message)

                $eventBus.$emit('transaction-broadcast-error', { error: e.message, data: emitData })
              }
            } else {
              $eventBus.$emit('transaction-broadcast-error', { error: 'Request was canceled by the user.', data: emitData })
            }
          })
          .catch((e) => {
            console.log(e.message)

            $eventBus.$emit('transaction-broadcast-error', { error: e.message, data: emitData })
          })
      } else {
        window[IS_HIVE ? 'hive_keychain' : 'steem_keychain'].requestBroadcast(username, operations, keyType, (r) => {
          if (r.success) {
            console.log(r.result)

            if (emitEvent) {
              $eventBus.$emit(emitEvent, emitData || r.result)
            }

            if (mutation) {
              commitMutation(this, mutation, mutationData)
            }
          } else {
            $eventBus.$emit('transaction-broadcast-error', { error: r.message, data: emitData })
          }
        })
      }
    },

    showConfirmation ({ title, message = 'Are you sure?', variant = 'success', okText = 'Yes', cancelText = 'No' }) {
      const { $eventBus } = useNuxtApp()

      return new Promise((resolve, reject) => {
        $eventBus.$emit('show-modal', 'confirmation') // TODO(P3): wire modal

        // TODO(P3): wire modal — was $bvModal.msgBoxConfirm(message, { title, okVariant: variant,
        // okTitle: okText, cancelTitle: cancelText }); auto-confirms for now. The wired modal must
        // resolve() on OK and reject(new Error('User canceled!')) on cancel/close.
        Promise.resolve(true).then((value) => {
          if (value) {
            return resolve()
          }

          return reject(new Error('User canceled!'))
        })
          .catch(() => reject(new Error('User canceled!')))
      })
    },

    showNotification ({ title, message, type = 'success' }) {
      const { $eventBus } = useNuxtApp()

      // TODO(P3): wire notifications (was Vue.notify from vue-notification)
      $eventBus.$emit('notify', {
        title,
        type,
        text: message
      })
    },

    showUnlockModal (keyType) {
      const { $eventBus } = useNuxtApp()
      const { username } = useAuthStore().user
      let pin = '' // eslint-disable-line prefer-const

      // TODO(P3): wire modal — the legacy implementation rendered a $bvModal.msgBoxConfirm with a
      // b-avatar + pincode-input VNode that collected `pin`, then unlocked on confirm. The smartlock
      // modal must collect the pin and confirm (value = true) to run the unlock flow below.
      $eventBus.$emit('show-modal', 'smartlock') // TODO(P3): wire modal

      return new Promise((resolve, reject) => {
        // TODO(P3): wire modal — auto-cancels for now (no pin source until the modal is wired)
        Promise.resolve(false).then(async (value) => {
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
})
