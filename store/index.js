import Vue from 'vue'
import { IS_HIVE } from '@/config'
import { encrypt as WCEncrypt, decrypt as WCDecrypt } from '@/utils/web-crypto'
import { decrypt } from '@/utils/triplesec'

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

      config.vote_regeneration_seconds = config.vote_regeneration_days * 24 * 60 * 60

      commit('SET_TRIBE_INFO', info)
      commit('SET_TRIBE_CONFIG', config)
    } catch (e) {
      console.log(e)
    }
  },

  async nuxtServerInit ({ dispatch }) {
    await dispatch('fetchTokenInfoAndConfig')
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
