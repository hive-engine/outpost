<template>
  <main style="font-family: system-ui; max-width: 640px; margin: 4rem auto; padding: 0 1rem;">
    <h1>The BBH Project — Nuxt 3 migration</h1>
    <p>Phase 0 skeleton is live. Legacy Nuxt 2 app preserved in <code>legacy/</code>; pages are
    being ported in per <code>MIGRATION.md</code>.</p>
    <p>Build target: {{ appDomain }}</p>
  </main>
</template>

<script setup>
const appDomain = useRuntimeConfig().public.appDomain
</script>
