<template>
  <button v-if="!isSelf" class="tip-btn" title="Tip this author" @click.prevent.stop="onClick">💰</button>
</template>

<script setup>
// Opens the global tip modal for this post's author (or the login modal if logged out).
import { useAuthStore } from '~/stores/auth'
import { useUiStore } from '~/stores/ui'

const props = defineProps({ author: { type: String, required: true } })

const auth = useAuthStore()
const ui = useUiStore()
const { $eventBus } = useNuxtApp()

const isSelf = computed(() => auth.loggedIn && auth.user.username === props.author)

const onClick = () => {
  if (!auth.loggedIn) { ui.showModal('loginModal'); return }
  $eventBus.$emit('open-tip', { author: props.author })
}
</script>

<style scoped>
.tip-btn {
  background: none; border: 0; cursor: pointer;
  padding: .2rem .4rem; font-size: .95rem; line-height: 1;
  opacity: .7; transition: opacity .15s ease, transform .12s ease;
}
.tip-btn:hover { opacity: 1; transform: translateY(-1px); }
</style>
