// Notifications store — one source of truth for the unread counts shown as badges
// on the header/sidebar bell, the /notifications filter pills, and the profile
// Mentions tab. "Unread" = notifications newer than the last-seen marker (the
// highest notification id the user has seen), persisted per-account in
// localStorage. Visiting /notifications marks everything seen (clears the badges).
//
// Data comes from Hive's bridge.account_notifications via a node-failover $fetch
// (dhive's bridge routing is flaky), same as the notifications page.
import { defineStore } from 'pinia'
import { useAuthStore } from '~/stores/auth'

const seenKey = account => `bbh-notif-seen-${account}`

// Notification ids are 17-digit integers (beyond Number.MAX_SAFE_INTEGER), so we
// track "seen" by timestamp (ms) instead — safe to compare and store. Dates come
// without a zone; treat them as UTC (matches the notifications page's `${date}Z`).
const tsOf = n => Date.parse(`${n.date}Z`) || 0

export const useNotificationsStore = defineStore('notifications', {
  state: () => ({
    items: [],
    lastSeen: 0, // ms timestamp of the newest notification the user has seen
    loaded: false
  }),

  getters: {
    // Notifications newer than what the user has already seen.
    unread: state => state.items.filter(n => tsOf(n) > state.lastSeen),

    unreadCount () { return this.unread.length },

    // Per-category unread counts (reply_comment folds into reply).
    unreadByType () {
      const counts = { mention: 0, reply: 0, vote: 0, follow: 0, reblog: 0 }
      for (const n of this.unread) {
        const t = n.type === 'reply_comment' ? 'reply' : n.type
        if (counts[t] != null) { counts[t] += 1 }
      }
      return counts
    }
  },

  actions: {
    // Loads the persisted marker; returns whether one existed (to baseline first-timers).
    _loadSeen (account) {
      let raw = null
      try { raw = localStorage.getItem(seenKey(account)) } catch { /* storage disabled */ }
      this.lastSeen = Number(raw) || 0
      return raw != null
    },

    // Fetch the logged-in user's notifications (newest first) with node failover.
    async fetch () {
      const auth = useAuthStore()

      if (!auth.loggedIn) {
        this.items = []
        this.lastSeen = 0
        this.loaded = true
        return
      }

      const account = auth.user.username
      const hadMarker = this._loadSeen(account)

      const config = useRuntimeConfig().public
      const nodes = config.NODES || []

      for (const node of nodes) {
        try {
          const res = await $fetch(node, {
            method: 'POST',
            body: { jsonrpc: '2.0', method: 'bridge.account_notifications', params: { account, limit: 100 }, id: 1 },
            timeout: 8000
          })

          if (res && Array.isArray(res.result)) {
            this.items = res.result
            break
          }
        } catch { /* try the next node */ }
      }

      // First time (feature just launched for this account): baseline to the newest
      // notification so the badge starts clean and only counts activity from now on.
      if (!hadMarker && this.items.length) {
        this.lastSeen = this.items.reduce((m, n) => Math.max(m, tsOf(n)), 0)
        try { localStorage.setItem(seenKey(account), String(this.lastSeen)) } catch { /* storage disabled */ }
      }

      this.loaded = true
    },

    // Mark everything currently loaded as seen — clears the badges.
    markSeen () {
      const auth = useAuthStore()
      if (!auth.loggedIn || !this.items.length) { return }

      const maxTs = this.items.reduce((m, n) => Math.max(m, tsOf(n)), this.lastSeen)
      this.lastSeen = maxTs

      try { localStorage.setItem(seenKey(auth.user.username), String(maxTs)) } catch { /* storage disabled */ }
    },

    // Reset on logout so a stale count doesn't linger.
    reset () {
      this.items = []
      this.lastSeen = 0
      this.loaded = false
    }
  }
})
