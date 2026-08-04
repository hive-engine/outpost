<template>
  <b-modal v-model="show" :title="`Tip @${author}`" centered no-footer>
    <div class="tip-assets">
      <button
        v-for="a in assets"
        :key="a"
        class="tip-asset"
        :class="{ active: asset === a }"
        @click="asset = a"
      >{{ a }}</button>
    </div>

    <b-form-group label="Amount" class="mt-3">
      <b-input-group :append="asset">
        <b-form-input v-model="amount" type="number" min="0" step="0.001" :disabled="sending" @keyup.enter="send" />
      </b-input-group>
    </b-form-group>

    <b-form-group label="Message (optional)">
      <b-form-input v-model="memo" trim :disabled="sending" placeholder="Nice post!" />
    </b-form-group>

    <b-button variant="primary" class="w-100 mt-2" :disabled="sending || !valid" @click="send">
      <b-spinner v-if="sending" small />
      <template v-else>Send {{ amount || '' }} {{ asset }} to @{{ author }}</template>
    </b-button>
  </b-modal>
</template>

<script setup>
// Global tip modal — opened via the event bus ('open-tip', { author }) from any
// TipButton. Sends a BBHO / HIVE / HBD transfer to the author (reuses the wallet
// transfer actions). Mounted once in the layout.
import { useAuthStore } from '~/stores/auth'
import { useUserStore } from '~/stores/user'

const { $eventBus, $notify } = useNuxtApp()
const auth = useAuthStore()
const userStore = useUserStore()
const config = useRuntimeConfig().public

const assets = [config.TOKEN, 'HIVE', 'HBD']

const show = ref(false)
const author = ref('')
const asset = ref(config.TOKEN)
const amount = ref('')
const memo = ref('')
const sending = ref(false)

const valid = computed(() => Number(amount.value) > 0 && author.value)

const send = () => {
  const amt = Number(amount.value)
  if (!amt || amt <= 0 || sending.value) { return }
  sending.value = true

  if (asset.value === config.TOKEN) {
    userStore.requestTokenAction({ action: 'transfer', amount: amt, to: author.value, memo: memo.value })
  } else {
    userStore.requestHiveAction({ action: 'transfer', amount: amt, to: author.value, memo: memo.value, asset: asset.value })
  }
}

const onSuccess = () => {
  if (!sending.value) { return }
  const to = author.value
  sending.value = false
  show.value = false
  $notify({ title: 'Tip sent 🎉', type: 'success', text: `Sent ${amount.value} ${asset.value} to @${to}` })
}

const onError = () => { sending.value = false }

onMounted(() => {
  $eventBus.$on('open-tip', ({ author: a }) => {
    if (!auth.loggedIn) { return }
    author.value = a
    asset.value = config.TOKEN
    amount.value = ''
    memo.value = ''
    show.value = true
  })
  $eventBus.$on(['tokens-transfer-successful', 'hive-transfer-successful'], onSuccess)
  $eventBus.$on('transaction-broadcast-error', onError)
})

onBeforeUnmount(() => {
  $eventBus.$off('open-tip')
  $eventBus.$off(['tokens-transfer-successful', 'hive-transfer-successful'], onSuccess)
  $eventBus.$off('transaction-broadcast-error', onError)
})
</script>

<style scoped>
.tip-assets { display: flex; gap: .5rem; }
.tip-asset {
  flex: 1; border: 1px solid var(--w3-border); background: var(--w3-panel); color: var(--w3-muted);
  font-weight: 700; padding: .4rem; border-radius: 10px; cursor: pointer; transition: all .15s ease;
}
.tip-asset:hover { color: var(--w3-text); border-color: var(--w3-gold); }
.tip-asset.active { color: #1a1206; background: linear-gradient(135deg, var(--w3-gold), #ffd34d); border-color: transparent; }
</style>
