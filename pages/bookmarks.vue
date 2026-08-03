<template>
  <div class="bookmarks-page">
    <b-container>
      <div class="bm-header">
        <h1 class="bm-title"><fa-icon icon="bookmark" /> Bookmarks</h1>
        <p class="bm-sub">Posts you saved to read later — synced to your account, on every device.</p>
      </div>

      <div v-if="!auth.loggedIn" class="bm-empty">
        <p>Log in to see your bookmarks.</p>
        <b-button variant="primary" @click="ui.showModal('loginModal')">Log in</b-button>
      </div>

      <loading v-else-if="!bookmarks.loaded" />

      <div v-else-if="bookmarks.items.length" class="bm-list">
        <div v-for="b in bookmarks.items" :key="`${b.author}/${b.permlink}`" class="bm-item">
          <nuxt-link :to="{ name: 'user-post', params: { user: b.author, post: b.permlink } }" class="bm-link">
            <b-avatar :src="`${config.IMAGES_CDN}u/${b.author}/avatar`" variant="dark" size="36px" />
            <div class="bm-body">
              <span class="bm-post-title">{{ b.title || `@${b.author}/${b.permlink}` }}</span>
              <span class="bm-meta">@{{ b.author }} · saved <timeago :datetime="new Date(b.savedAt)" :auto-update="60" /></span>
            </div>
          </nuxt-link>

          <button class="bm-del" title="Remove bookmark" @click.prevent="bookmarks.remove(b.author, b.permlink)">
            <fa-icon icon="times" />
          </button>
        </div>
      </div>

      <div v-else class="bm-empty">
        <fa-icon icon="bookmark" class="bm-empty-icon" />
        <p>No bookmarks yet. Tap the <fa-icon :icon="['far', 'bookmark']" /> on any post to save it here.</p>
      </div>
    </b-container>
  </div>
</template>

<script setup>
// Read-later list — the user's account-synced bookmarks.
import Loading from '@/components/Loading.vue'
import Timeago from '~/components/app/Timeago.vue'
import { useBookmarksStore } from '~/stores/bookmarks'
import { useAuthStore } from '~/stores/auth'
import { useUiStore } from '~/stores/ui'

const config = useRuntimeConfig().public
const bookmarks = useBookmarksStore()
const auth = useAuthStore()
const ui = useUiStore()

useHead({ title: 'Bookmarks' })

onMounted(() => { if (auth.loggedIn && !bookmarks.loaded) { bookmarks.fetch() } })
</script>

<style scoped>
.bookmarks-page { max-width: 720px; margin: 0 auto; padding: 0 clamp(.8rem, 3vw, 1.4rem) 4rem; }
.bm-header { padding: 1.6rem 0 1rem; }
.bm-title {
  font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 1.8rem; margin: 0;
  background: linear-gradient(135deg, var(--w3-gold), #ffd34d); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
}
.bm-sub { color: var(--w3-muted); margin: .3rem 0 0; font-size: .92rem; }

.bm-list { display: flex; flex-direction: column; }
.bm-item { display: flex; align-items: center; gap: .6rem; border-bottom: 1px solid var(--w3-border); }
.bm-link {
  display: flex; align-items: center; gap: .8rem; flex: 1; min-width: 0;
  padding: .85rem .3rem; text-decoration: none; color: var(--w3-text);
}
.bm-link:hover { background: rgba(255, 255, 255, .02); }
.bm-body { display: flex; flex-direction: column; min-width: 0; }
.bm-post-title { font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bm-meta { color: var(--w3-muted); font-size: .78rem; }
.bm-del { background: none; border: 0; color: var(--w3-muted); cursor: pointer; padding: .4rem .6rem; }
.bm-del:hover { color: var(--w3-red, #ff5964); }

.bm-empty { text-align: center; color: var(--w3-muted); padding: 3rem 1rem; }
.bm-empty-icon { font-size: 2rem; color: var(--w3-gold); margin-bottom: .6rem; }
</style>
