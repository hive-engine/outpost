<template>
  <div class="user-mentions">
    <b-container fluid="lg">
      <loading v-if="loading && !mentions.length" />

      <div v-else-if="mentions.length" class="mentions-list">
        <nuxt-link
          v-for="(n, i) of mentions"
          :key="i"
          :to="linkFor(n)"
          class="mention-item"
        >
          <span class="mention-icon"><fa-icon icon="at" /></span>
          <div class="mention-body">
            <span class="mention-msg">{{ n.msg }}</span>
            <timeago class="mention-time" :datetime="dateOf(n)" :title="dateOf(n).toLocaleString()" :auto-update="60" />
          </div>
        </nuxt-link>

        <div v-if="loadingMore" class="mention-more"><loading small /></div>
        <button v-else-if="!done" class="mention-loadmore" @click="loadMore">Load more</button>
      </div>

      <b-card v-else class="mt-5">
        <p class="text-center text-muted mb-0">No mentions yet.</p>
      </b-card>
    </b-container>
  </div>
</template>

<script>
// Profile "Mentions" tab — posts/comments where this user is @mentioned, via
// Hive's bridge.account_notifications (public; node-failover fetch). Complements
// the global /notifications page (owner asked for mentions on the profile too).
import Loading from '@/components/Loading.vue'
import Timeago from '~/components/app/Timeago.vue'

export default {
  name: 'UserMentions',

  components: { Loading, Timeago },

  setup () {
    return { config: useRuntimeConfig().public }
  },

  data () {
    return { mentions: [], loading: true, loadingMore: false, done: false, lastId: 0 }
  },

  mounted () {
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
      const params = { account: this.$route.params.user, limit: 100 }
      if (this.lastId) { params.last_id = this.lastId }

      const res = await this.bridgeCall(params)
      if (Array.isArray(res) && res.length) {
        this.mentions.push(...res.filter(n => n.type === 'mention'))
        this.lastId = res[res.length - 1].id
        if (res.length < 100) { this.done = true }
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

    linkFor (n) {
      const url = (n.url || '').replace(/^@/, '')
      if (!url) { return {} }
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
.mentions-list { max-width: 720px; margin: 1rem auto 0; }
.mention-item {
  display: flex; align-items: center; gap: .85rem;
  padding: .85rem .4rem; border-bottom: 1px solid var(--w3-border);
  text-decoration: none; color: var(--w3-text); transition: background .12s ease;
}
.mention-item:hover { background: rgba(255, 255, 255, .02); }
.mention-icon {
  flex: 0 0 auto; width: 38px; height: 38px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  color: var(--w3-gold); background: rgba(245, 184, 0, .12);
}
.mention-body { display: flex; flex-direction: column; min-width: 0; }
.mention-msg { font-size: .95rem; }
.mention-time { color: var(--w3-muted); font-size: .78rem; }
.mention-more { text-align: center; color: var(--w3-muted); padding: 1.2rem; }
.mention-loadmore {
  margin: 1.2rem auto 0; display: block;
  border: 1px solid var(--w3-border); background: var(--w3-panel); color: var(--w3-text);
  font-weight: 700; padding: .5rem 1.4rem; border-radius: 999px; cursor: pointer;
}
.mention-loadmore:hover { border-color: var(--w3-gold); color: var(--w3-gold); }
</style>
