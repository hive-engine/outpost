<template>
  <StaticContent slug="faq" />
</template>

<script setup>
// Explicit route /faq (mirrors legacy extendRoutes per-file static routes).
import StaticContent from '~/components/app/StaticContent.vue'
definePageMeta({ name: 'faq' })
</script>
