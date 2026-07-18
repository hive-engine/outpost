<template>
  <div class="login">
    <b-modal v-model="ui.modals.loginModal" title="Login" hide-footer centered>
      <div class="pt-md-3 pb-md-3 pe-md-5 ps-md-5">
        <div class="form-group">
          <b-form-input v-model.trim="username" placeholder="Hive username" :state="v$.username.$dirty ? !v$.username.$error : null" @keyup.enter="logMeIn" />
        </div>

        <div class="text-center">
          <b-button variant="success" class="w-100" @click="logMeIn">
            Login with Keychain
          </b-button>

          <client-only>
            <template v-if="!isKeychain">
              <p class="small mt-3 mb-0">
                Download Hive Keychain for
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

const logMeIn = async () => {
  v$.value.$touch()

  if (window.hive_keychain && !v$.value.$invalid) {
    await userStore.login({ username: username.value })

    ui.hideModal('loginModal')
  }
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

      if (wif) {
        await smartLockLogin(username.value, wif)
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
})
</script>
