<template>
  <button
    class="bookmark-btn"
    :class="{ on: bookmarked }"
    :title="bookmarked ? 'Remove bookmark' : 'Save for later'"
    @click.prevent.stop="onClick"
  >
    <fa-icon :icon="bookmarked ? 'bookmark' : ['far', 'bookmark']" />
  </button>
</template>

<script setup>
// Toggle a post in the user's account-synced bookmarks (read-later).
import { useBookmarksStore } from '~/stores/bookmarks'
import { useAuthStore } from '~/stores/auth'
import { useUiStore } from '~/stores/ui'

const props = defineProps({ post: { type: Object, required: true } })

const bookmarks = useBookmarksStore()
const auth = useAuthStore()
const ui = useUiStore()
const { $notify } = useNuxtApp()

const bookmarked = computed(() => bookmarks.isBookmarked(props.post.author, props.post.permlink))

const onClick = async () => {
  if (!auth.loggedIn) { ui.showModal('loginModal'); return }

  const nowOn = await bookmarks.toggle({
    author: props.post.author,
    permlink: props.post.permlink,
    title: props.post.title
  })

  $notify({
    title: nowOn ? 'Saved' : 'Removed',
    type: 'success',
    text: nowOn ? 'Added to your bookmarks.' : 'Removed from bookmarks.'
  })
}
</script>

<style scoped>
.bookmark-btn {
  background: none;
  border: 0;
  color: var(--w3-muted);
  cursor: pointer;
  padding: .2rem .4rem;
  font-size: 1rem;
  line-height: 1;
  transition: color .15s ease, transform .12s ease;
}
.bookmark-btn:hover { color: var(--w3-gold); transform: translateY(-1px); }
.bookmark-btn.on { color: var(--w3-gold); }
</style>
