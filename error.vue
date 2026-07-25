<template>
  <div class="err">
    <div class="err-bg" />
    <div class="err-inner">
      <div class="err-code mono">{{ error.statusCode || 500 }}</div>
      <h1 class="err-title">{{ title }}</h1>
      <p class="err-msg">{{ message }}</p>
      <button class="err-btn" @click="handleError">{{ isRpc ? '↻ Try again' : '← Back to the feed' }}</button>
    </div>
  </div>
</template>

<script setup>
// Web3 Bold themed error page (replaces the default light Nuxt error page).
const props = defineProps({ error: { type: Object, default: () => ({}) } })

// A Hive RPC / network outage (503, or a message mentioning hive/rpc/network) is
// shown as a distinct, reassuring state — "it's the Hive network, not us".
const isRpc = computed(() => props.error.statusCode === 503 || /hive|rpc|network/i.test(props.error.statusMessage || ''))

const title = computed(() => {
  if (isRpc.value) { return 'Hive network unavailable' }
  return props.error.statusCode === 404 ? 'Lost in the chain' : 'Something broke'
})

const message = computed(() => {
  if (isRpc.value) {
    return "We can't reach the Hive network right now — this is a Hive RPC-node issue, not the site itself. Please try again in a moment."
  }
  return props.error.statusMessage || props.error.message || 'Something went wrong.'
})

const handleError = () => {
  if (isRpc.value && import.meta.client) { window.location.reload(); return }
  clearError({ redirect: '/' })
}

useHead({ title: `${props.error.statusCode || 'Error'} · The BBH Project` })
</script>

<style scoped>
.err {
  min-height: 100vh;
  display: flex; align-items: center; justify-content: center;
  background: #08080c; color: #f4f4f5; position: relative; overflow: hidden;
  font-family: 'Space Grotesk', system-ui, sans-serif; text-align: center; padding: 2rem;
}
.err-bg {
  position: absolute; inset: 0; pointer-events: none;
  background:
    radial-gradient(50vw 50vw at 30% 10%, rgba(224, 31, 38, 0.25), transparent 60%),
    radial-gradient(45vw 45vw at 75% 20%, rgba(245, 184, 0, 0.18), transparent 55%);
  filter: blur(24px);
}
.err-inner { position: relative; z-index: 1; }
.err-code {
  font-family: 'JetBrains Mono', monospace; font-size: clamp(4rem, 14vw, 9rem); font-weight: 700; line-height: 1;
  background: linear-gradient(135deg, #e01f26, #f5b800); -webkit-background-clip: text; background-clip: text; color: transparent;
  text-shadow: 0 0 60px rgba(245, 184, 0, 0.3);
}
.err-title { font-size: clamp(1.6rem, 4vw, 2.4rem); font-weight: 700; margin: .8rem 0 .5rem; letter-spacing: -0.02em; }
.err-msg { color: #a1a1aa; max-width: 460px; margin: 0 auto 2rem; }
.err-btn {
  border: 0; padding: .8rem 1.6rem; border-radius: 999px; font-weight: 700; cursor: pointer; font-size: 1rem;
  color: #1a1206; background: linear-gradient(135deg, #f5b800, #ffd34d); box-shadow: 0 0 30px rgba(245, 184, 0, 0.35);
}
.err-btn:hover { filter: brightness(1.05); }
</style>
