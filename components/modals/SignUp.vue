<template>
  <b-modal
    id="signupModal"
    title="Sign Up"
    centered
    no-close-on-backdrop
    size="lg"
    hide-footer
  >
    <Loading v-if="loading" small />

    <template v-else-if="!config.enabled">
      <b-alert variant="warning" class="text-center mt-5 mb-5" show>
        New account creation is temporarily disabled. Please check back later.
      </b-alert>
    </template>

    <template v-else-if="config.tokensAvailable <= 0">
      <b-alert variant="warning" class="text-center mt-5 mb-5" show>
        We do not have enough account creation tokens at the moment. Please check back later.
      </b-alert>
    </template>

    <template v-else-if="requestData">
      <template v-if="config.paymentRequired">
        <b-alert show variant="info">
          <table class="table table-borderless border-0 text-dark">
            <tbody>
              <tr>
                <td>Username</td>
                <td>{{ requestData.username }}</td>
              </tr>
              <tr>
                <td>Amount</td>
                <td>{{ requestData.amount }} {{ requestData.symbol }}</td>
              </tr>
              <tr>
                <td>To</td>
                <td>{{ requestData.to }}</td>
              </tr>
              <tr>
                <td>Memo</td>
                <td>{{ requestData.uid }}</td>
              </tr>
            </tbody>
          </table>
        </b-alert>

        <div class="text-center mt-5">
          <b-button variant="primary" @click="requestPayment">
            Pay with {{ isHiveKeychain ? 'Hive Keychain': 'HiveSigner' }}
          </b-button>
        </div>
      </template>

      <b-alert v-else show variant="info" class="mt-5 mb-5">
        We have received your request to create <strong>@{{ requestData.username }}</strong>. Please allow us a few minutes to create the account.
      </b-alert>
    </template>

    <template v-else>
      <b-form-group label="Desired Username" description="Hive accounts are identified by username. This username can be used to log into any Hive based application.">
        <b-form-input v-model="username" :state="$v.username.$dirty ? !$v.username.$error : null" debounce="300" @input="$emit('input', $event); $v.$touch()" />

        <b-form-invalid-feedback v-if="!$v.username.usernameExists">
          This username is aready exists. Please choose a different one.
        </b-form-invalid-feedback>
      </b-form-group>

      <b-form-group label="Password" description="This password will be used to generate your other keys. Please download the key file and store it in a safe place. If you lose them, you'll lose access to your account, and there is no way to recover them.">
        <b-input-group>
          <b-form-input v-model="password" readonly />
          <template #append>
            <b-button variant="primary" @click="generatePassword">
              <fa-icon icon="redo-alt" />
            </b-button>
          </template>
        </b-input-group>
      </b-form-group>

      <b-form-group>
        <b-button size="sm" variant="info" :disabled="username.length < 3 || username.length > 16 || $v.username.$invalid" @click="requestDownloadKeys">
          Download Keys
        </b-button>
      </b-form-group>

      <b-form-group v-if="config.paymentRequired" label="Payment Options">
        <b-form-radio-group v-model="currency" :options="paymentOptions" name="payment-option" required :state="$v.currency.$dirty ? !$v.currency.$error : null">
          <b-form-invalid-feedback :state="$v.currency.$dirty ? !$v.currency.$error : null">
            Please select a payment option.
          </b-form-invalid-feedback>
        </b-form-radio-group>
      </b-form-group>

      <b-form-group>
        <div id="captcha" class="h-captcha" :data-sitekey="`${$config.HCAPTCHA_KEY}`" />
      </b-form-group>

      <b-form-group>
        <b-form-checkbox v-model="keysDownloaded" :unchecked-value="false">
          I have downloaded the keys and saved it in a safe place. I understand that if I lose them, there is no way to recover them.
        </b-form-checkbox>
      </b-form-group>

      <b-button variant="primary" :disabled="!keysDownloaded || !captchaResponse" @click="requestSignup">
        Sign Up
      </b-button>
    </template>
  </b-modal>
</template>

<script>
import axios from 'axios'
import { PrivateKey } from '@hiveio/dhive'
import { required } from 'vuelidate/lib/validators'
import { mapActions } from 'vuex'
import requiredIf from 'vuelidate/lib/validators/requiredIf'

const b64uLookup = { '/': '_', _: '/', '+': '-', '-': '+', '=': '.', '.': '=' }
const b64uEncode = str => btoa(str).replace(/(\+|\/|=)/g, m => b64uLookup[m])

export default {
  name: 'SignupModal',

  data () {
    return {
      loading: true,

      username: '',
      password: '',
      currency: '',

      captchaResponse: null,

      keysDownloaded: false,
      config: {},
      requestData: null
    }
  },

  head () {
    return {
      script: [{
        src: 'https://js.hcaptcha.com/1/api.js?recaptchacompat=off',
        async: true,
        defer: true
      }]
    }
  },

  computed: {
    paymentOptions () {
      if (this.config) {
        return this.config.paymentConfig.reduce((acc, cur) => {
          acc.push({ value: cur[0], text: `${cur[1]} ${cur[0]}` })
          return acc
        }, [])
      }

      return []
    },

    isHiveKeychain () {
      return window && window.hive_keychain
    }
  },

  mounted () {
    this.$root.$on('bv::modal::show', this.onModalShow)
    this.$root.$on('bv::modal::hidden', this.onModalHidden)
  },

  beforeDestroy () {
    this.$root.$off('bv::modal::show', this.onModalShow)
    this.$root.$off('bv::modal::hidden', this.onModalHidden)
  },

  methods: {
    ...mapActions(['requestBroadcastOps']),

    async onModalShow (btnEvent, modalId) {
      if (modalId === 'signupModal') {
        this.loading = true

        try {
          const { data } = await axios.get(`${this.$config.OUTPOST_ONBOARD_API}/config/${this.$config.OUTPOST_ONBOARD_ID}`)

          this.config = data
        } catch (e) {
          console.log(e)
        }

        this.loading = false

        await this.sleep(500)

        if (this.config.enabled && this.config.tokensAvailable) {
          this.generatePassword()

          window.hcaptcha.render('captcha', {
            siteKey: this.$config.HCAPTCHA_KEY,
            theme: this.$colorMode.value,
            callback: this.onCaptachSuccess,
            'expired-callback': this.onCaptachExpire
          })
        }
      }
    },

    onModalHidden (btnEvent, modalId) {
      if (modalId === 'signupModal') {
        this.$v.$reset()

        this.config = {}
        this.username = ''
        this.currency = ''
        this.captchaResponse = null
        this.keysDownloaded = false
        this.requestData = null
      }
    },

    generatePassword () {
      const array = new Uint32Array(10)
      window.crypto.getRandomValues(array)

      this.keysDownloaded = false
      this.password = `P${PrivateKey.fromSeed(array).toString()}`
    },

    requestDownloadKeys () {
      this.$v.$touch()

      if (!this.$v.$invalid) {
        axios({
          url: `${this.$config.OUTPOST_ONBOARD_API}/download`,
          method: 'POST',
          data: {
            username: this.username,
            password: this.password
          },
          responseType: 'blob'
        }).then((response) => {
          const url = window.URL.createObjectURL(response.data)

          const link = document.createElement('a')
          link.href = url
          link.setAttribute('download', `Hive-Account-${this.username}.txt`)
          document.body.appendChild(link)
          link.click()

          link.remove()
        })
      }
    },

    async requestSignup () {
      this.$v.$touch()

      if (!this.$v.$invalid) {
        const payload = {
          username: this.username,
          password: this.password,
          token: this.captchaResponse
        }

        if (this.config && this.config.paymentRequired) {
          payload.currency = this.currency
        }

        try {
          const { data: requestData } = await axios.post(`${this.$config.OUTPOST_ONBOARD_API}/create/${this.$config.OUTPOST_ONBOARD_ID}`, payload)

          this.requestData = requestData
        } catch (e) {
          this.requestData = null

          this.$notify({ title: 'Error', type: 'error', text: e.response?.data?.message || 'There was an error, please try again later!' })
        }
      }
    },

    onCaptachSuccess (value) {
      this.captchaResponse = value
    },

    onCaptachExpire () {
      this.captchaResponse = null
    },

    requestPayment () {
      const { uid, to, amount, symbol } = this.requestData

      if (['HIVE', 'HBD'].includes(symbol)) {
        if (window.hive_keychain) {
          window.hive_keychain.requestTransfer(null, to, amount.toFixed(3), uid, symbol, (r) => {
            if (r.success) {
              this.$bvModal.hide('signupModal')

              this.$notify({ title: 'Success', type: 'success', text: 'We will verify the payment and create the account as soon as verification is complete.' })
            }
          })
        } else {
          const op = b64uEncode(JSON.stringify(['transfer', { from: '__signer', to, amount: `${amount} ${symbol}`, memo: uid }]))

          window.open(`https://hivesigner.com/sign/op/${op}`, '_blank')
        }
      } else {
        const json = JSON.stringify({
          contractName: 'tokens',
          contractAction: 'transfer',
          contractPayload: {
            to,
            symbol,
            quantity: amount.toString(),
            memo: uid
          }
        })

        if (window.hive_keychain) {
          window.hive_keychain.requestCustomJson(null, this.$config.SIDECHAIN_ID, 'Active', json, 'Payment', (r) => {
            if (r.success) {
              this.$bvModal.hide('signupModal')

              this.$notify({ title: 'Success', type: 'success', text: 'We will verify the payment and create the account as soon as verification is complete.' })
            }
          })
        } else {
          const op = b64uEncode(JSON.stringify(['custom_json', { required_auths: ['__signer'], required_posting_auths: [], id: 'ssc-mainnet-hive', json }]))

          window.open(`https://hivesigner.com/sign/op/${op}?authority=active`, '_blank')
        }
      }
    }

  },

  validations: {
    username: {
      required,
      validUsername: (value) => {
        if (value === '') { return true }

        return value === value.toLowerCase() && value.length >= 3 && value.length <= 16 && /^([a-z])[a-z0-9-.]*$/.test(value)
      },

      async usernameExists (value) {
        if (value === '') { return true }

        const [account] = await this.$chain.client.database.getAccounts([value])

        return !account
      }
    },

    currency: {
      required: requiredIf(function () {
        return this.config && this.config.paymentRequired
      })
    }
  }
}
</script>
