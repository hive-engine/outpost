<template>
  <div class="smartLock">
    <b-modal id="smartLock" title="SmartLock" hide-footer centered>
      <b-row v-if="Object.keys(smartLockAccounts).length > 0" class="mb-3">
        <b-col v-for="(account,i) in Object.keys(smartLockAccounts)" :key="i" md="6" class="mb-2">
          <div class="account-link bg-light" @click.prevent="unlockAccount(account)">
            <b-avatar :src="`https://images.hive.blog/u/${account}/avatar`" variant="dark" class="border mr-1" />
            @{{ account }}
            <a href="#" class="remove-account" @click.stop.prevent="removeAccount(account)">
              <fa-icon icon="times" />
            </a>
          </div>
        </b-col>
      </b-row>

      <b-card no-body class="bg-light text-muted">
        <ul class="p-3 pl-4 m-0">
          <li>Account names and corresponding keys are stored in your browser</li>
          <li>Keys are never sent over any network</li>
          <li>Keys are encrypted and usable only when unlocked via PIN CODE</li>
        </ul>
      </b-card>

      <div class="text-center mt-3">
        <b-button variant="info" @click.prevent="$bvModal.show('smartLockAddAccount')">
          Add Account
        </b-button>
      </div>
    </b-modal>

    <b-modal
      id="smartLockAddAccount"
      title="Add Account"
      centered
      hide-footer
      hide-backdrop
      no-close-on-backdrop
    >
      <b-alert dismissible variant="warning" :show="showError">
        {{ error }}
      </b-alert>

      <b-form-group label="Hive username">
        <b-form-input v-model.trim="username" />
      </b-form-group>

      <template v-for="(key, k) of keyTypes">
        <b-form-group :key="k" :label="`Hive Private ${key} Key`" label-class="text-capitalize">
          <b-form-input v-model="keys[key]" trim type="password" />
        </b-form-group>
      </template>

      <b-form-group label="Password">
        <div class="text-center">
          <PincodeInput v-model="password" :length="5" :secure="true" placeholder="0" />
        </div>
      </b-form-group>

      <b-form-group label="Confirm Password">
        <div class="text-center">
          <pincode-input v-model="cpassword" :length="5" :secure="true" placeholder="0" />
        </div>
      </b-form-group>

      <b-button variant="info" :disabled="username.length < 3 || Object.values(keys)[0].length < 51 || password.length < 5 || cpassword.length < 5" @click.prevent="addAccount">
        <span v-if="buttonBusy" class="spinner-border spinner-border-sm" role="status" aria-hidden="true" /> Add Account
      </b-button>
    </b-modal>

    <b-modal
      id="smartLockUnlockAccount"
      title="Unlock Account"
      centered
      hide-footer
      hide-backdrop
      no-close-on-backdrop
    >
      <b-alert dismissible variant="warning" :show="showError">
        {{ error }}
      </b-alert>

      <div class="text-center">
        <b-avatar :src="`https://images.hive.blog/u/${unlockingAccount}/avatar`" size="100px" variant="dark" class="border" />
        <div class="font-weight-bold mt-2">
          @{{ unlockingAccount }}
        </div>

        <b-form-group label="Password" class="mt-3">
          <PincodeInput v-model="unlockingPassword" :length="5" :secure="true" placeholder="0" />
        </b-form-group>

        <b-button variant="info" class="mt-3" @click.prevent="unlockAccount()">
          <span v-if="buttonBusy" class="spinner-border spinner-border-sm" role="status" aria-hidden="true" /> Unlock Account
        </b-button>
      </div>
    </b-modal>
  </div>
</template>

<script>
import { encrypt, decrypt } from '@/utils/triplesec'
import { encrypt as WCEncrypt } from '@/utils/web-crypto'

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

  watch: {
    async unlockingPassword (value) {
      if (value.length === 5) {
        await this.unlockAccount()
      }
    }
  },

  created () {
    if (process.client && !sessionStorage.getItem('smartlock-otp')) {
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
    const self = this

    this.$root.$on('bv::modal::show', (bvEvent, modalId) => {
      if (modalId === 'smartLock') {
        self.loadAccounts()
      }

      if (modalId === 'smartLock' || modalId === 'smartLockAddAccount' || modalId === 'smartLockUnlockAccount') {
        this.error = ''
        this.showError = false
      }
    })

    this.$root.$on('smartlock-loggedin', () => {
      this.$root.$bvModal.hide('smartLock')
      this.$root.$bvModal.hide('smartLockAddAccount')
      this.$root.$bvModal.hide('smartLockUnlockAccount')
    })
  },

  methods: {
    loadAccounts () {
      if (process.client) {
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

        this.$bvModal.hide('smartLockAddAccount')
        this.$bvModal.show('smartLockUnlockAccount')
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

          this.$root.$emit('smartlock-loggedin')

          this.$bvModal.hide('smartLockUnlockAccount')

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
</style>
