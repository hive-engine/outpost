<template>
  <transition name="fade">
    <b-button v-if="visible" variant="info" class="btn-to-top" @click="scrollTop">
      <fa-icon icon="chevron-up" />
    </b-button>
  </transition>
</template>

<script setup>
// Minimal replacement for vue-backtotop (Vue 2 only).
const visible = ref(false)

const onScroll = () => { visible.value = window.scrollY > 300 }
const scrollTop = () => window.scroll({ top: 0, left: 0, behavior: 'smooth' })

onMounted(() => window.addEventListener('scroll', onScroll, { passive: true }))
onUnmounted(() => window.removeEventListener('scroll', onScroll))
</script>

<style scoped>
.btn-to-top {
  position: fixed;
  bottom: 50px;
  right: 50px;
  z-index: 1030;
}
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
