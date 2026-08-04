<template>
  <div class="lb-page">
    <b-container>
      <div class="lb-header">
        <h1 class="lb-title">🏆 Leaderboards</h1>
        <p class="lb-sub">
          Top {{ config.TOKEN }} holders, authors, curators &amp; most active in the community.<span v-if="updatedAt"> · updated <timeago :datetime="new Date(updatedAt)" :auto-update="60" /></span>
        </p>
      </div>

      <div class="lb-tabs">
        <button v-for="t in tabs" :key="t.key" class="lb-tab" :class="{ active: tab === t.key }" @click="tab = t.key">
          {{ t.label }}
        </button>
      </div>

      <loading v-if="loading" />

      <div v-else-if="rows.length" class="lb-list">
        <div v-for="(r, i) in rows" :key="r.account" class="lb-row" :class="{ podium: i < 3 }">
          <span class="lb-rank" :class="`r${i + 1}`">{{ i + 1 }}</span>
          <nuxt-link :to="{ name: 'user', params: { user: r.account } }" class="lb-acct">
            <b-avatar :src="`${config.IMAGES_CDN}u/${r.account}/avatar`" variant="dark" size="34px" />
            <span>@{{ r.account }}</span>
          </nuxt-link>
          <span class="lb-value mono">{{ fmt(r.value) }} <small>{{ unit }}</small></span>
        </div>
      </div>

      <b-card v-else class="mt-4">
        <p class="text-center text-muted mb-0">No data to show yet.</p>
      </b-card>
    </b-container>
  </div>
</template>

<script setup>
// Community leaderboards — data computed + cached server-side (/api/v1/leaderboards).
import Loading from '@/components/Loading.vue'
import Timeago from '~/components/app/Timeago.vue'

const config = useRuntimeConfig().public

useHead({ title: 'Leaderboards' })

const tabs = [
  { key: 'holders', label: 'Top Holders' },
  { key: 'authors', label: 'Top Authors' },
  { key: 'curators', label: 'Top Curators' },
  { key: 'active', label: 'Most Active' }
]

const tab = ref('holders')
const data = ref({ holders: [], authors: [], curators: [], active: [], updatedAt: 0 })
const loading = ref(true)

const rows = computed(() => data.value[tab.value] || [])
const updatedAt = computed(() => data.value.updatedAt)

const unit = computed(() => ({ holders: config.TOKEN, authors: config.TOKEN, curators: '%', active: 'posts' }[tab.value]))

const fmt = (v) => {
  const n = Number(v) || 0
  const dp = tab.value === 'active' ? 0 : (tab.value === 'curators' ? 2 : (n >= 1000 ? 0 : 3))
  return n.toLocaleString('en-US', { maximumFractionDigits: dp })
}

onMounted(async () => {
  try { data.value = await $fetch('/api/v1/leaderboards') } catch { /* leave empty */ }
  loading.value = false
})
</script>

<style scoped>
.lb-page { max-width: 720px; margin: 0 auto; padding: 0 clamp(.8rem, 3vw, 1.4rem) 4rem; }
.lb-header { padding: 1.6rem 0 1rem; }
.lb-title {
  font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 1.8rem; margin: 0;
  background: linear-gradient(135deg, var(--w3-gold), #ffd34d); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
}
.lb-sub { color: var(--w3-muted); margin: .3rem 0 0; font-size: .88rem; }

.lb-tabs { display: flex; gap: .5rem; overflow-x: auto; margin-bottom: 1rem; scrollbar-width: none; }
.lb-tabs::-webkit-scrollbar { display: none; }
.lb-tab {
  flex: 0 0 auto; border: 1px solid var(--w3-border); background: var(--w3-panel); color: var(--w3-muted);
  font-weight: 700; font-size: .82rem; padding: .35rem .95rem; border-radius: 999px; cursor: pointer; transition: all .15s ease;
}
.lb-tab:hover { color: var(--w3-text); border-color: var(--w3-gold); }
.lb-tab.active { color: #1a1206; background: linear-gradient(135deg, var(--w3-gold), #ffd34d); border-color: transparent; }

.lb-list { display: flex; flex-direction: column; }
.lb-row {
  display: flex; align-items: center; gap: .8rem;
  padding: .7rem .3rem; border-bottom: 1px solid var(--w3-border);
}
.lb-row.podium { background: rgba(245, 184, 0, .04); }
.lb-rank {
  flex: 0 0 auto; width: 26px; text-align: center; font-weight: 800; color: var(--w3-muted); font-size: .9rem;
}
.lb-rank.r1 { color: #ffd34d; }
.lb-rank.r2 { color: #cbd5e1; }
.lb-rank.r3 { color: #e09b5a; }
.lb-acct { display: flex; align-items: center; gap: .6rem; flex: 1; min-width: 0; text-decoration: none; color: var(--w3-text); font-weight: 600; }
.lb-acct:hover { color: var(--w3-gold); }
.lb-acct span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.lb-value { flex: 0 0 auto; font-weight: 700; color: var(--w3-gold); }
.lb-value small { color: var(--w3-muted); font-weight: 600; }
</style>
