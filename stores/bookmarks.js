// Bookmarks / read-later store — account-scoped, persisted server-side (via
// /api/v1/bookmarks) so saved posts follow the user across devices. Mirrors the
// drafts model. The store holds a flat list of { author, permlink, title, savedAt }.
import { defineStore } from 'pinia'
import { useAuthStore } from '~/stores/auth'

export const useBookmarksStore = defineStore('bookmarks', {
  state: () => ({
    items: [],
    loaded: false
  }),

  getters: {
    count: state => state.items.length
  },

  actions: {
    isBookmarked (author, permlink) {
      return this.items.some(b => b.author === author && b.permlink === permlink)
    },

    async fetch () {
      const auth = useAuthStore()

      if (!auth.loggedIn) {
        this.items = []
        this.loaded = true
        return
      }

      try {
        const { $api } = this.$nuxt
        const res = await $api.$get('/api/v1/bookmarks')
        this.items = Array.isArray(res.bookmarks) ? res.bookmarks : []
      } catch { /* keep whatever we had */ }

      this.loaded = true
    },

    async sync () {
      const auth = useAuthStore()
      if (!auth.loggedIn) { return }

      try {
        const { $api } = this.$nuxt
        await $api.$post('/api/v1/bookmarks', { bookmarks: this.items })
      } catch { /* best effort */ }
    },

    // Add or remove a post. Returns the new bookmarked state.
    async toggle (post) {
      const { author, permlink } = post
      const idx = this.items.findIndex(b => b.author === author && b.permlink === permlink)

      let bookmarked
      if (idx >= 0) {
        this.items.splice(idx, 1)
        bookmarked = false
      } else {
        this.items.unshift({ author, permlink, title: post.title || '', savedAt: Date.now() })
        bookmarked = true
      }

      await this.sync()
      return bookmarked
    },

    async remove (author, permlink) {
      this.items = this.items.filter(b => !(b.author === author && b.permlink === permlink))
      await this.sync()
    },

    reset () {
      this.items = []
      this.loaded = false
    }
  }
})
