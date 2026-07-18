<template>
  <div class="smartLock">
    <b-modal id="smartLock" v-model="ui.modals.smartLock" title="SmartLock" hide-footer centered>
      <b-row v-if="Object.keys(smartLockAccounts).length > 0" class="mb-3">
        <b-col v-for="(account,i) in Object.keys(smartLockAccounts)" :key="i" md="6" class="mb-2">
          <div class="account-link bg-light" @click.prevent="unlockAccount(account)">
            <b-avatar :src="`https://images.hive.blog/u/${account}/avatar`" variant="dark" class="border me-1" />
            @{{ account }}
            <a href="#" class="remove-account" @click.stop.prevent="removeAccount(account)">
              <fa-icon icon="times" />
            </a>
          </div>
        </b-col>
      </b-row>

      <b-card no-body class="bg-light text-muted">
        <ul class="p-3 ps-4 m-0">
          <li>Account names and corresponding keys are stored in your browser</li>
          <li>Keys are never sent over any network</li>
          <li>Keys are encrypted and usable only when unlocked via PIN CODE</li>
        </ul>
      </b-card>

      <div class="text-center mt-3">
        <b-button variant="info" @click.prevent="ui.showModal('smartLockAddAccount')">
          Add Account
        </b-button>
      </div>
    </b-modal>

    <b-modal
      id="smartLockAddAccount"
      v-model="ui.modals.smartLockAddAccount"
      title="Add Account"
      centered
      hide-footer
      hide-backdrop
      no-close-on-backdrop
    >
      <b-alert v-model="showError" dismissible variant="warning">
        {{ error }}
      </b-alert>

      <b-form-group label="Hive username">
        <b-form-input v-model.trim="username" />
      </b-form-group>

      <template v-for="(key, k) of keyTypes" :key="k">
        <b-form-group :label="`Hive Private ${key} Key`" label-class="text-capitalize">
          <b-form-input v-model="keys[key]" trim type="password" />
        </b-form-group>
      </template>

      <b-form-group label="Password">
        <div class="text-center">
          <!-- TODO(P5): nicer pincode UI (legacy used vue-pincode-input, Vue 2 only) -->
          <input
            v-model="password"
            type="password"
            inputmode="numeric"
            maxlength="5"
            placeholder="•••••"
            autocomplete="off"
            class="form-control d-inline-block text-center pincode-input"
          >
        </div>
      </b-form-group>

      <b-form-group label="Confirm Password">
        <div class="text-center">
          <input
            v-model="cpassword"
            type="password"
            inputmode="numeric"
            maxlength="5"
            placeholder="•••••"
            autocomplete="off"
            class="form-control d-inline-block text-center pincode-input"
          >
        </div>
      </b-form-group>

      <b-button variant="info" :disabled="username.length < 3 || Object.values(keys)[0].length < 51 || password.length < 5 || cpassword.length < 5" @click.prevent="addAccount">
        <span v-if="buttonBusy" class="spinner-border spinner-border-sm" role="status" aria-hidden="true" /> Add Account
      </b-button>
    </b-modal>

    <b-modal
      id="smartLockUnlockAccount"
      v-model="ui.modals.smartLockUnlockAccount"
      title="Unlock Account"
      centered
      hide-footer
      hide-backdrop
      no-close-on-backdrop
    >
      <b-alert v-model="showError" dismissible variant="warning">
        {{ error }}
      </b-alert>

      <div class="text-center">
        <b-avatar :src="`https://images.hive.blog/u/${unlockingAccount}/avatar`" size="100px" variant="dark" class="border" />
        <div class="fw-bold mt-2">
          @{{ unlockingAccount }}
        </div>

        <b-form-group label="Password" class="mt-3">
          <input
            v-model="unlockingPassword"
            type="password"
            inputmode="numeric"
            maxlength="5"
            placeholder="•••••"
            autocomplete="off"
            class="form-control d-inline-block text-center pincode-input"
          >
        </b-form-group>

        <b-button variant="info" class="mt-3" @click.prevent="unlockAccount()">
          <span v-if="buttonBusy" class="spinner-border spinner-border-sm" role="status" aria-hidden="true" /> Unlock Account
        </b-button>
      </div>
    </b-modal>
  </div>
</template>

<script>
// Ported from legacy/components/modals/SmartLock.vue (Options API kept).
// - b-modal ids (smartLock / smartLockAddAccount / smartLockUnlockAccount, exactly as
//   legacy) → v-model="ui.modals.<id>" via useUiStore; $bvModal.show/hide → ui.show/hideModal.
// - The legacy 'bv::modal::show' root listener (reload accounts + clear stale errors on
//   open) → watchers on ui.modals.* below.
// - $root.$on/$emit('smartlock-loggedin') → $eventBus (adapter API unchanged).
// - vue-pincode-input (Vue 2 only) → minimal inline inputs, see TODO(P5) in template.
// - process.client → import.meta.client; mr-1→me-1, pl-4→ps-4, font-weight-bold→fw-bold (BS5).
// - Crypto flow unchanged: triplesec encrypt/decrypt for at-rest keys in localStorage
//   ('smartlock-accounts'), web-crypto re-encrypt with the per-session OTP
//   (sessionStorage 'smartlock-otp') into sessionStorage 'smartlock-<user>-<keyType>'.
import { encrypt, decrypt } from '~/utils/triplesec'
import { encrypt as WCEncrypt } from '~/utils/web-crypto'
import { useUiStore } from '~/stores/ui'

export default {
  name: 'SmartLock',

  props: {
    keyTypes: { type: Array, default: () => ['posting'] },
    callback: { type: Function, default: () => {} }
  },

  data () {
    return {
      username: '',
      keys: {},
      password: '',
      cpassword: '',
      keySize: 256,
      iterations: 100,
      smartLockAccounts: {},
      unlockingAccount: '',
      unlockingPassword: '',
      buttonBusy: false,
      error: '',
      showError: false,

      keysMap: {}
    }
  },

  computed: {
    ui () {
      return useUiStore()
    }
  },

  watch: {
    async unlockingPassword (value) {
      if (value.length === 5) {
        await this.unlockAccount()
      }
    },

    // Legacy listened to the BootstrapVue root event 'bv::modal::show' — gone in
    // bootstrap-vue-next; watching the ui-store modal flags is the equivalent.
    'ui.modals.smartLock' (value) {
      if (value) {
        this.loadAccounts()

        this.clearError()
      }
    },

    'ui.modals.smartLockAddAccount' (value) {
      if (value) { this.clearError() }
    },

    'ui.modals.smartLockUnlockAccount' (value) {
      if (value) { this.clearError() }
    }
  },

  created () {
    if (import.meta.client && !sessionStorage.getItem('smartlock-otp')) {
      const otp = Math.random().toString(36).substring(2)

      sessionStorage.setItem('smartlock-otp', otp)
    }

    this.keys = this.keyTypes.reduce((acc, cur) => {
      acc[cur] = ''

      return acc
    }, {})

    this.loadAccounts()
  },

  mounted () {
    this.$eventBus.$on('smartlock-loggedin', this.onLoggedIn)
  },

  beforeUnmount () {
    this.$eventBus.$off('smartlock-loggedin', this.onLoggedIn)
  },

  methods: {
    onLoggedIn () {
      this.ui.hideModal('smartLock')
      this.ui.hideModal('smartLockAddAccount')
      this.ui.hideModal('smartLockUnlockAccount')
    },

    clearError () {
      this.error = ''
      this.showError = false
    },

    loadAccounts () {
      if (import.meta.client) {
        this.smartLockAccounts = {}

        const accounts = localStorage.getItem('smartlock-accounts')

        if (accounts) {
          this.smartLockAccounts = JSON.parse(accounts)
        }
      }
    },

    async addAccount () {
      this.buttonBusy = true

      try {
        if (this.password === this.cpassword) {
          const keys = Object.keys(this.keys)

          const account = {}

          for (let i = 0; i < keys.length; i += 1) {
            const keyType = keys[i]
            const key = this.keys[keyType]

            if (key.length < 51) {
              continue
            }

            const credentialsValid = await this.credentialsValid(this.username, key, keyType)

            if (credentialsValid) {
              const encryptedKey = await encrypt(key, this.password)

              account[keyType] = encryptedKey

              this.keys[keyType] = ''
            } else {
              this.error = `The key you have entered is not a valid ${keyType} key for @${this.username}.`
              this.showError = true
            }
          }

          localStorage.setItem('smartlock-accounts', JSON.stringify({ ...this.smartLockAccounts, [this.username]: account }))

          this.unlockAccount(this.username)

          this.username = ''
        } else {
          this.error = 'Your password and confirmation password do not match.'
          this.showError = true
        }
      } catch (e) {
        console.log(e.message)
      }

      this.password = ''
      this.cpassword = ''
      this.buttonBusy = false
    },

    async unlockAccount (username) {
      if (username) {
        this.unlockingAccount = username
        this.unlockingPassword = ''

        this.ui.hideModal('smartLockAddAccount')
        this.ui.showModal('smartLockUnlockAccount')
      } else {
        try {
          this.buttonBusy = true

          this.loadAccounts()

          const account = this.smartLockAccounts[this.unlockingAccount]
          const keys = Object.keys(account)

          for (let i = 0; i < keys.length; i += 1) {
            const keyType = keys[i]

            const decryptedKey = await decrypt(account[keyType], this.unlockingPassword)

            const storageKey = `smartlock-${this.unlockingAccount}-${keyType}`

            const wcEncrypted = await WCEncrypt(decryptedKey, sessionStorage.getItem('smartlock-otp'))

            sessionStorage.setItem(storageKey, wcEncrypted)
          }

          this.$eventBus.$emit('smartlock-loggedin')

          this.ui.hideModal('smartLockUnlockAccount')

          this.callback(this.unlockingAccount, sessionStorage.getItem(`smartlock-${this.unlockingAccount}-${this.keyTypes[0]}`))
        } catch (e) {
          this.unlockingPassword = ''
          this.showError = true
          this.error = `Error unlocking @${this.unlockingAccount}`

          console.log(e.message)
        }

        this.buttonBusy = false
      }
    },

    removeAccount (username) {
      delete this.smartLockAccounts[username]

      localStorage.setItem('smartlock-accounts', JSON.stringify(this.smartLockAccounts))

      this.loadAccounts()
    },

    async getUserKeysMap (username) {
      const keys = {}

      let accounts = null
      try {
        const client = this.$chain.getClient()

        accounts = await client.database.getAccounts([username])
      } catch (err) {
        console.error('Error getting data from chain', err)
        return keys
      }

      if (accounts.length !== 1) { return keys }

      const [account] = accounts

      keys[account.memo_key] = 'memo'

      const types = ['owner', 'active', 'posting']

      for (let i = 0; i < types.length; i += 1) {
        const keysOfType = account[types[i]].key_auths

        for (let j = 0; j < keysOfType.length; j += 1) {
          keys[keysOfType[j][0]] = types[i]
        }
      }

      return keys
    },

    async credentialsValid (username, privateKey, type = null) {
      const keysMap = this.keysMap[username] ? this.keysMap[username] : await this.getUserKeysMap(username)

      this.keysMap[username] = keysMap

      const key = this.$chain.PrivateKey.from(privateKey)

      if (type) {
        return keysMap[key.createPublic().toString()] === type.toLowerCase()
      }

      return !!keysMap[key.createPublic().toString()]
    }
  }
}
</script>

<style lang="scss">
#smartLock {
  .account-link {
    position: relative;
    border: none;
    padding: 5px;
    display: block;
    text-decoration: none;
    border-radius: 0.3rem;
    transition: 300ms;
    cursor: pointer;
    font-weight: 700;

    &:hover,
    &:focus {
      opacity: 0.8;
      text-decoration: none;
    }
  }

  .remove-account {
    position: absolute;
    right: 10px;
    display: inline-block;
    margin-top: 10px;
    color: red;

    .icon {
      width: 16px;
    }
  }
}

.pincode-input {
  max-width: 10rem;
  letter-spacing: 0.5rem;
}
</style>
