<template>
  <svg v-if="points" :viewBox="`0 0 ${w} ${h}`" :width="w" :height="h" class="sparkline" preserveAspectRatio="none">
    <polyline :points="points" fill="none" :stroke="color" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
  </svg>
</template>

<script setup>
// Tiny inline SVG sparkline (no chart lib). `values` are plotted left→right,
// normalised to their own min/max.
const props = defineProps({
  values: { type: Array, default: () => [] },
  w: { type: Number, default: 240 },
  h: { type: Number, default: 44 },
  color: { type: String, default: '#f5b800' }
})

const points = computed(() => {
  const v = props.values.filter(x => Number.isFinite(x))
  if (v.length < 2) { return '' }

  const min = Math.min(...v)
  const max = Math.max(...v)
  const range = (max - min) || 1
  const stepX = props.w / (v.length - 1)

  return v.map((y, i) => `${(i * stepX).toFixed(1)},${(props.h - ((y - min) / range) * props.h).toFixed(1)}`).join(' ')
})
</script>

<style scoped>
.sparkline { display: block; }
</style>
