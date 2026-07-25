<template>
  <div ref="sentinel" class="infinite-loading text-center py-3">
    <b-spinner v-if="state === 'loading'" small />
    <div v-else-if="state === 'complete'" class="text-muted small">
      <slot name="no-more" />
    </div>
  </div>
</template>

<script setup>
// Drop-in replacement for vue-infinite-loading (Vue 2 only), keeping the same
// usage: <InfiniteLoading :identifier="id" @infinite="handler" /> where the
// handler receives a $state with loaded()/complete()/reset(). Backed by an
// IntersectionObserver instead of scroll events.
const props = defineProps({
  identifier: { type: [String, Number], default: 0 }
})

const emit = defineEmits(['infinite'])

const sentinel = ref(null)
const state = ref('idle') // idle | loading | complete
let observer = null

const $state = {
  loaded () {
    state.value = 'idle'
    // If the sentinel is still visible after loading, fetch the next batch
    nextTick(() => check())
  },
  complete () {
    state.value = 'complete'
  },
  reset () {
    state.value = 'idle'
  }
}

const check = () => {
  if (state.value !== 'idle' || !sentinel.value) { return }

  const rect = sentinel.value.getBoundingClientRect()

  if (rect.top <= window.innerHeight + 100) {
    state.value = 'loading'
    emit('infinite', $state)
  }
}

onMounted(() => {
  observer = new IntersectionObserver((entries) => {
    if (entries.some(e => e.isIntersecting)) { check() }
  }, { rootMargin: '100px' })

  observer.observe(sentinel.value)
  check()
})

onUnmounted(() => {
  if (observer) { observer.disconnect() }
})

// Changing the identifier restarts the loader (same contract as vue-infinite-loading)
watch(() => props.identifier, () => {
  state.value = 'idle'
  nextTick(() => check())
})
</script>
