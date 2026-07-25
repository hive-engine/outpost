<template>
  <StaticContent slug="tos" />
</template>

<script setup>
// Explicit route /tos (mirrors legacy extendRoutes per-file static routes).
import StaticContent from '~/components/app/StaticContent.vue'
definePageMeta({ name: 'tos' })
</script>
