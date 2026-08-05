<template>
  <div v-if="show" class="kc-health-banner" :class="state">
    <fa-icon icon="exclamation-circle" class="kcb-icon" />
    <span class="kcb-text">
      <template v-if="state === 'missing'">
        <strong>Hive Keychain isn't loading on this page.</strong>
        Voting, transfers and posting can't be signed without it. In Brave: click the
        <strong>Shields</strong> icon → turn Shields <strong>OFF</strong> for this site, confirm Hive Keychain is
        enabled in <em>brave://extensions</em>, then Retry.
      </template>
      <template v-else>
        <strong>Hive Keychain is installed but not responding.</strong>
        Click the extension icon and <strong>unlock it</strong> (enter your PIN), then Retry. In Brave, also try
        turning Shields off for this site.
      </template>
    </span>
    <button class="kcb-retry" @click="check">
      <fa-icon icon="sync" /> Retry
    </button>
    <button class="kcb-dismiss" title="Dismiss" @click="dismissed = true">
      <fa-icon icon="times" />
    </button>
  </div>
</template>

<script setup>
// Proactive Keychain readiness check. The login session is a server-side cookie,
// so a user stays "logged in" across refreshes even when Keychain later fails to
// inject (Brave Shields, disabled/updated extension) or sits locked. In that state
// clicking vote/transfer produces a silent failure — no popup, and the in-app
// error toast is easy to miss. This banner surfaces the problem up-front and
// un-missably, before the user clicks anything (jongo: "totally silent").
//
// Only relevant for Keychain accounts (smartlock signs locally with a stored WIF).
import { useAuthStore } from '~/stores/auth'

const auth = useAuthStore()

const state = ref('checking') // checking | ok | missing | unresponsive
const dismissed = ref(false)

const show = computed(() =>
  import.meta.client &&
  auth.loggedIn &&
  !auth.user?.smartlock &&
  !dismissed.value &&
  (state.value === 'missing' || state.value === 'unresponsive')
)

// Poll for late-injecting Keychain (some browsers inject after first paint).
const waitForKeychain = (timeout) => new Promise((resolve) => {
  const started = performance.now()
  const poll = () => {
    if (window.hive_keychain) { return resolve(true) }
    if (performance.now() - started >= timeout) { return resolve(false) }
    setTimeout(poll, 200)
  }
  poll()
})

// requestHandshake calls back when the extension is alive; it does NOT require an
// unlocked wallet, so a callback === "Keychain is reachable". No callback within
// the window === installed-but-wedged/blocked.
const handshake = (timeout) => new Promise((resolve) => {
  let done = false
  const t = setTimeout(() => { if (!done) { done = true; resolve(false) } }, timeout)
  try {
    window.hive_keychain.requestHandshake(() => {
      if (!done) { done = true; clearTimeout(t); resolve(true) }
    })
  } catch {
    clearTimeout(t)
    resolve(false)
  }
})

const check = async () => {
  if (!import.meta.client || !auth.loggedIn || auth.user?.smartlock) { return }

  dismissed.value = false
  state.value = 'checking'

  const injected = await waitForKeychain(3000)
  if (!injected) { state.value = 'missing'; return }

  state.value = (await handshake(3000)) ? 'ok' : 'unresponsive'
}

onMounted(check)
watch(() => auth.loggedIn, loggedIn => { if (loggedIn) { check() } })
</script>

<style scoped>
.kc-health-banner {
  display: flex;
  align-items: center;
  gap: .7rem;
  flex-wrap: wrap;
  justify-content: center;
  padding: .6rem 1rem;
  background: linear-gradient(90deg, rgba(224, 31, 38, .18), rgba(245, 184, 0, .18));
  border-bottom: 1px solid rgba(245, 184, 0, .35);
  color: var(--w3-text, #f4f4f5);
  font-size: .9rem;
  position: relative;
  z-index: 60;
}
.kcb-icon { color: var(--w3-gold, #f5b800); flex-shrink: 0; }
.kcb-text { max-width: 820px; }
.kcb-text strong { color: var(--w3-gold, #f5b800); }
.kcb-text em { font-style: normal; text-decoration: underline; }
.kcb-retry {
  border: 1px solid rgba(245, 184, 0, .5);
  background: transparent;
  color: var(--w3-gold, #f5b800);
  font-weight: 700;
  border-radius: 999px;
  padding: .25rem .8rem;
  cursor: pointer;
  white-space: nowrap;
  transition: all .15s ease;
}
.kcb-retry:hover { background: var(--w3-gold, #f5b800); color: #1a1206; }
.kcb-dismiss {
  border: none;
  background: transparent;
  color: var(--w3-text, #f4f4f5);
  opacity: .6;
  cursor: pointer;
  padding: .25rem .5rem;
}
.kcb-dismiss:hover { opacity: 1; }
</style>
