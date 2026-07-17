<template>
  <main style="font-family: system-ui; max-width: 640px; margin: 4rem auto; padding: 0 1rem;">
    <h1>The BBH Project — Nuxt 3 migration</h1>
    <p>Phase 1 infra check: Pinia + plugins + runtimeConfig, live against the SCOT API.</p>
    <ul>
      <li>Token: <strong>{{ config.TOKEN }}</strong> (runtimeConfig)</li>
      <li>Tribe precision: <strong>{{ tribe.tribe_info?.precision ?? '…' }}</strong> (tribe store ← $scot)</li>
      <li>Reward pool id: <strong>{{ tribe.tribe_config?.reward_pool_id ?? '…' }}</strong></li>
      <li>Logged in: <strong>{{ auth.loggedIn }}</strong> (auth store)</li>
    </ul>
    <p>Pages are being ported per <code>MIGRATION.md</code>; legacy app preserved in <code>legacy/</code>.</p>
  </main>
</template>

<script setup>
import { useTribeStore } from '~/stores/tribe'
import { useAuthStore } from '~/stores/auth'

const config = useRuntimeConfig().public
const tribe = useTribeStore()
const auth = useAuthStore()

// Same startup call the legacy app made via nuxtServerInit
await useAsyncData('tribe-init', async () => {
  await tribe.init()
  return true
})
</script>
