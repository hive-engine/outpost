<template>
  <div class="notif-page">
    <div class="notif-header">
      <h1 class="notif-title"><fa-icon icon="bell" /> Notifications</h1>
      <p class="notif-sub">Mentions, replies, votes, follows &amp; reblogs — everything about you on Hive.</p>
    </div>

    <div class="notif-filters">
      <button
        v-for="f of filters"
        :key="f.key"
        class="notif-filter"
        :class="{ active: filter === f.key }"
        @click="filter = f.key"
      >{{ f.label }}</button>
    </div>

    <loading v-if="loading && !items.length" />

    <div v-else-if="filtered.length" class="notif-list">
      <component
        :is="linkFor(n) ? 'nuxt-link' : 'div'"
        v-for="(n, i) of filtered"
        :key="i"
        :to="linkFor(n)"
        class="notif-item"
        :class="`t-${n.type}`"
      >
        <span class="notif-icon"><fa-icon :icon="iconFor(n.type)" /></span>
        <div class="notif-body">
          <span class="notif-msg">{{ n.msg }}</span>
          <timeago class="notif-time" :datetime="dateOf(n)" :title="dateOf(n).toLocaleString()" :auto-update="60" />
        </div>
      </component>

      <div v-if="loadingMore" class="notif-more"><loading small /></div>
      <button v-else-if="!done" class="notif-loadmore" @click="loadMore">Load more</button>
    </div>

    <div v-else class="notif-empty">
      <fa-icon icon="bell" /> Nothing here yet.
    </div>
  </div>
</template>

<script>
// Notifications — surfaces Hive's bridge.account_notifications (mentions, replies,
// votes, follows, reblogs) for the logged-in user, which weren't visible on the
// frontend before (owner feedback: "I can't see when someone mentions me").
// Uses a node-failover fetch (dhive's bridge routing is flaky).
import Loading from '@/components/Loading.vue'
import Timeago from '~/components/app/Timeago.vue'
import { useAuthStore } from '~/stores/auth'

export default {
  name: 'NotificationsPage',

  components: { Loading, Timeago },

  setup () {
    const config = useRuntimeConfig().public
    const auth = useAuthStore()
    useHead({ title: 'Notifications' })
    return { config, auth }
  },

  data () {
    return {
      items: [],
      filter: 'all',
      loading: true,
      loadingMore: false,
      done: false,
      lastId: 0,
      filters: [
        { key: 'all', label: 'All' },
        { key: 'mention', label: 'Mentions' },
        { key: 'reply', label: 'Replies' },
        { key: 'vote', label: 'Votes' },
        { key: 'follow', label: 'Follows' },
        { key: 'reblog', label: 'Reblogs' }
      ]
    }
  },

  computed: {
    filtered () {
      if (this.filter === 'all') { return this.items }
      if (this.filter === 'reply') { return this.items.filter(n => n.type === 'reply' || n.type === 'reply_comment') }
      return this.items.filter(n => n.type === this.filter)
    }
  },

  mounted () {
    if (!this.auth.loggedIn) { return navigateTo('/') }
    this.load()
  },

  methods: {
    async bridgeCall (params) {
      const nodes = this.config.NODES || []
      for (const node of nodes) {
        try {
          const res = await $fetch(node, {
            method: 'POST',
            body: { jsonrpc: '2.0', method: 'bridge.account_notifications', params, id: 1 },
            timeout: 8000
          })
          if (res && Array.isArray(res.result)) { return res.result }
        } catch { /* next node */ }
      }
      return null
    },

    async load () {
      const params = { account: this.auth.user.username, limit: 50 }
      if (this.lastId) { params.last_id = this.lastId }

      const res = await this.bridgeCall(params)
      if (Array.isArray(res) && res.length) {
        this.items.push(...res)
        this.lastId = res[res.length - 1].id
        if (res.length < 50) { this.done = true }
      } else {
        this.done = true
      }
      this.loading = false
    },

    async loadMore () {
      if (this.loadingMore || this.done) { return }
      this.loadingMore = true
      await this.load()
      this.loadingMore = false
    },

    dateOf (n) { return new Date(`${n.date}Z`) },

    iconFor (type) {
      return {
        mention: 'at',
        reply: 'reply',
        reply_comment: 'reply',
        vote: 'heart',
        follow: 'users',
        reblog: 'retweet'
      }[type] || 'info-circle'
    },

    linkFor (n) {
      const url = (n.url || '').replace(/^@/, '')
      if (!url) { return null }
      if (url.includes('/')) {
        const [user, ...rest] = url.split('/')
        return { name: 'user-post', params: { user, post: rest.join('/').split('#')[0] } }
      }
      return { name: 'user', params: { user: url } }
    }
  }
}
</script>

<style scoped>
.notif-page { max-width: 720px; margin: 0 auto; padding: 0 clamp(.8rem, 3vw, 1.4rem) 4rem; }

.notif-header { padding: 1.6rem 0 1rem; }
.notif-title {
  font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 1.8rem; margin: 0;
  background: linear-gradient(135deg, var(--w3-gold), #ffd34d); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
}
.notif-sub { color: var(--w3-muted); margin: .3rem 0 0; font-size: .92rem; }

.notif-filters { display: flex; flex-wrap: wrap; gap: .45rem; margin-bottom: 1rem; }
.notif-filter {
  border: 1px solid var(--w3-border); background: var(--w3-panel); color: var(--w3-muted);
  font-weight: 700; font-size: .82rem; padding: .35rem .9rem; border-radius: 999px; cursor: pointer; transition: all .15s ease;
}
.notif-filter:hover { color: var(--w3-text); border-color: rgba(245, 184, 0, .4); }
.notif-filter.active { color: #1a1206; background: linear-gradient(135deg, var(--w3-gold), #ffd34d); border-color: transparent; }

.notif-list { display: flex; flex-direction: column; }
.notif-item {
  display: flex; align-items: center; gap: .85rem;
  padding: .85rem .4rem; border-bottom: 1px solid var(--w3-border);
  text-decoration: none; color: var(--w3-text); transition: background .12s ease;
}
.notif-item:hover { background: rgba(255, 255, 255, .02); }
.notif-icon {
  flex: 0 0 auto; width: 38px; height: 38px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  background: var(--w3-panel-2); color: var(--w3-muted);
}
.notif-item.t-mention .notif-icon { color: var(--w3-gold); background: rgba(245, 184, 0, .12); }
.notif-item.t-vote .notif-icon { color: #ff5964; background: rgba(255, 89, 100, .12); }
.notif-item.t-follow .notif-icon { color: #4da3ff; background: rgba(77, 163, 255, .12); }
.notif-item.t-reblog .notif-icon { color: #2ecc71; background: rgba(46, 204, 113, .12); }

.notif-body { display: flex; flex-direction: column; min-width: 0; }
.notif-msg { font-size: .95rem; overflow: hidden; text-overflow: ellipsis; }
.notif-time { color: var(--w3-muted); font-size: .78rem; }

.notif-more, .notif-empty { text-align: center; color: var(--w3-muted); padding: 2rem 1rem; }
.notif-loadmore {
  margin: 1.2rem auto 0; display: block;
  border: 1px solid var(--w3-border); background: var(--w3-panel); color: var(--w3-text);
  font-weight: 700; padding: .5rem 1.4rem; border-radius: 999px; cursor: pointer;
}
.notif-loadmore:hover { border-color: var(--w3-gold); color: var(--w3-gold); }
</style>
