<template>
  <div class="login">
    <b-modal v-model="ui.modals.loginModal" title="Login" no-footer centered>
      <!-- Normal login view (username + method buttons) -->
      <div v-if="!hiveAuthState" class="pt-md-3 pb-md-3 pe-md-5 ps-md-5">
        <div class="form-group">
          <b-form-input v-model.trim="username" placeholder="Hive username" :state="v$.username.$dirty ? !v$.username.$error : null" @keyup.enter="logMeIn" />
        </div>

        <div class="text-center">
          <b-button variant="success" class="w-100" @click="logMeIn">
            Login with Keychain
          </b-button>

          <b-button variant="primary" class="w-100 mt-2" @click="hiveAuthLogin">
            Login with HiveAuth <span class="small opacity-75">· mobile</span>
          </b-button>

          <client-only>
            <template v-if="isInAppBrowser">
              <b-alert :model-value="true" variant="warning" class="small mt-3 mb-0 text-start">
                You're in the Keychain in-app browser. Uploading video won't work here — use
                <b>Login with HiveAuth</b> above, or open thebbhproject.com in Safari/Chrome.
              </b-alert>
            </template>
            <template v-else-if="!isKeychain">
              <p class="small mt-3 mb-1">
                No Keychain extension detected — use <b>HiveAuth</b> above, or install Hive Keychain for
              </p>

              <ul class="list-inline">
                <li class="list-inline-item">
                  <a href="https://chrome.google.com/webstore/detail/hive-keychain/jcacnejopjdphbnjgfaaobbfafkihpep" target="_blank">Google Chrome/Opera/Brave</a>
                </li>
                <li class="list-inline-item">
                  <a href="https://addons.mozilla.org/en-GB/firefox/addon/hive-keychain/" target="_blank">Firefox</a>
                </li>
                <li class="list-inline-item">
                  <a href="https://play.google.com/store/apps/details?id=com.mobilekeychain" target="_blank">Android</a>
                </li>
                <li class="list-inline-item">
                  <a href="https://apps.apple.com/us/app/hive-keychain/id1552190010" target="_blank">iOS</a>
                </li>
              </ul>
            </template>
          </client-only>
          <hr>

          <!-- TODO(P4): SmartLock modal (legacy components/modals/SmartLock.vue, 372 lines)
               not yet ported — button informs the user instead of silently failing. -->
          <b-button variant="secondary" class="w-100" @click.prevent="ui.showModal('smartLock')">
            SmartLock
          </b-button>
        </div>
      </div>

      <!-- HiveAuth QR / approval view -->
      <div v-else class="pt-md-2 pb-md-2 pe-md-4 ps-md-4 text-center hiveauth-view">
        <h6 class="mb-3">Login with HiveAuth</h6>

        <template v-if="hiveAuthState === 'connecting'">
          <b-spinner small /> <span class="small ms-1">Connecting to HiveAuth…</span>
        </template>

        <template v-else-if="hiveAuthState === 'waiting'">
          <p class="small mb-2">
            Scan with the <b>Hive Keychain</b> or <b>HiveAuth</b> app — or tap the button below if you're on your phone.
          </p>
          <!-- QR is generated locally (uqr); the encoded key never leaves the device -->
          <div class="hiveauth-qr mx-auto" v-html="hiveAuthQr" />
          <a :href="hiveAuthDeeplink" class="btn btn-success btn-sm w-100 mt-3">Open in HiveAuth app</a>
          <p class="small text-muted mt-2 mb-0">
            Waiting for approval…<span v-if="countdown"> ({{ countdown }}s)</span>
          </p>
        </template>

        <template v-else-if="hiveAuthState === 'error'">
          <b-alert :model-value="true" variant="danger" class="small">{{ hiveAuthError }}</b-alert>
        </template>

        <b-button variant="link" size="sm" class="mt-2" @click="cancelHiveAuth">← Back</b-button>
      </div>
    </b-modal>

    <SmartLock :callback="smartLockLogin" :key-types="['posting', 'active']" />
  </div>
</template>

<script setup>
// Ported from legacy/components/modals/Login.vue.
// vuelidate 0.7 ($v) → @vuelidate/core (v$); b-modal id + $bvModal → ui.modals
// v-model; block buttons → w-100 (BS5); $root.$on('smartlock-loggedin') → $eventBus.
import { useVuelidate } from '@vuelidate/core'
import { required, minLength, maxLength } from '@vuelidate/validators'
import { useAuthStore } from '~/stores/auth'
import { useUserStore } from '~/stores/user'
import { useUiStore } from '~/stores/ui'
import SmartLock from '~/components/modals/SmartLock.vue'
import { renderSVG } from 'uqr'
import { useInAppBrowser } from '~/composables/useInAppBrowser'

const { $eventBus, $notify } = useNuxtApp()
const auth = useAuthStore()
const userStore = useUserStore()
const ui = useUiStore()

const username = ref('')

const rules = {
  username: { required, minLength: minLength(3), maxLength: maxLength(16) }
}

const v$ = useVuelidate(rules, { username })

const isKeychain = computed(() => import.meta.client && !!window.hive_keychain)
const { isInAppBrowser } = useInAppBrowser()

const logMeIn = async () => {
  v$.value.$touch()

  if (window.hive_keychain && !v$.value.$invalid) {
    await userStore.login({ username: username.value })

    ui.hideModal('loginModal')
  }
}

// --- HiveAuth login (QR / deeplink approval) ---
const hiveAuthState = ref(null) // null | 'connecting' | 'waiting' | 'error'
const hiveAuthQr = ref('')
const hiveAuthDeeplink = ref('')
const hiveAuthError = ref('')
const hiveAuthExpire = ref(0)
const countdown = ref(0)
let countdownTimer = null

const startCountdown = () => {
  stopCountdown()
  countdownTimer = setInterval(() => {
    const s = Math.max(0, Math.round((hiveAuthExpire.value - Date.now()) / 1000))
    countdown.value = s
    if (s <= 0) { stopCountdown() }
  }, 1000)
}
const stopCountdown = () => { if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null } }

const resetHiveAuth = () => {
  hiveAuthState.value = null
  hiveAuthQr.value = ''
  hiveAuthDeeplink.value = ''
  hiveAuthError.value = ''
  hiveAuthExpire.value = 0
  countdown.value = 0
  stopCountdown()
}
const cancelHiveAuth = () => resetHiveAuth()

const hiveAuthLogin = async () => {
  v$.value.$touch()
  if (v$.value.$invalid) { return }

  hiveAuthError.value = ''
  hiveAuthState.value = 'connecting'

  const ok = await userStore.loginWithHiveAuth({
    username: username.value,
    onWait: ({ deeplink, expire }) => {
      hiveAuthDeeplink.value = deeplink
      hiveAuthQr.value = renderSVG(deeplink)
      hiveAuthExpire.value = expire
      hiveAuthState.value = 'waiting'
      startCountdown()
    }
  })

  stopCountdown()

  if (ok && auth.loggedIn) {
    resetHiveAuth()
    ui.hideModal('loginModal')
  }
  // errors surface via the 'hiveauth-login-error' listener → state = 'error'
}

const smartLockLogin = async (user, wif) => {
  await userStore.loginWithKey({ username: user, wif })
}

// Legacy beforeMount auto-login: remembered username + smartlock key or Keychain retry
onBeforeMount(async () => {
  if (!auth.loggedIn) {
    username.value = localStorage.getItem('username') || ''

    if (username.value) {
      const wif = localStorage.getItem(`smartlock-${username.value}`)
      const rememberedMethod = localStorage.getItem('login-method')

      if (wif) {
        await smartLockLogin(username.value, wif)
      } else if (rememberedMethod === 'hiveauth') {
        // HiveAuth needs an explicit approval — never auto-pop a QR; the user
        // clicks "Login with HiveAuth" (their server session usually keeps them in).
      } else if (!window.hive_keychain) {
        // Keychain injects late on some browsers — retry twice
        setTimeout(() => {
          if (window.hive_keychain) { return logMeIn() }
          setTimeout(() => { if (window.hive_keychain) { logMeIn() } }, 1000)
        }, 500)
      } else {
        logMeIn()
      }
    }
  }
})

onMounted(() => {
  $eventBus.$on('smartlock-loggedin', () => ui.hideModal('loginModal'))
  $eventBus.$on('hiveauth-login-error', ({ error }) => {
    hiveAuthError.value = error || 'HiveAuth login failed.'
    hiveAuthState.value = 'error'
    stopCountdown()
  })
})

onBeforeUnmount(() => stopCountdown())
</script>

<style scoped>
.hiveauth-qr :deep(svg) {
  width: 210px;
  height: 210px;
  background: #fff;
  padding: 8px;
  border-radius: 10px;
}
.hiveauth-view { min-height: 160px; }
</style>
