<template>
  <div class="arcade-page">
    <b-container>
      <div class="arc-header">
        <h1 class="arc-title">🕹️ Arcade</h1>
        <p class="arc-sub">Play, climb the leaderboard, defend the hive. More games — and {{ config.TOKEN }} prizes — coming soon.</p>
      </div>

      <b-row>
        <b-col lg="7" class="mb-4">
          <BeeInvaders @saved="onSaved" />
        </b-col>

        <b-col lg="5">
          <div class="arc-lb">
            <div class="arc-lb-head">
              <h2>🐝 Bee Invaders</h2>
              <span class="arc-lb-sub">Top scores</span>
            </div>

            <loading v-if="loading" />

            <ol v-else-if="scores.length" class="arc-lb-list">
              <li v-for="(s, i) in scores" :key="s.user" class="arc-lb-row" :class="{ podium: i < 3, me: s.user === myUsername }">
                <span class="arc-rank" :class="`r${i + 1}`">{{ i + 1 }}</span>
                <nuxt-link :to="{ name: 'user', params: { user: s.user } }" class="arc-acct">
                  <b-avatar :src="`${config.IMAGES_CDN}u/${s.user}/avatar`" variant="dark" size="30px" />
                  <span>@{{ s.user }}</span>
                </nuxt-link>
                <span class="arc-score mono">{{ s.score.toLocaleString() }}</span>
              </li>
            </ol>

            <p v-else class="arc-empty">No scores yet — be the first to make the board!</p>

            <p class="arc-note">
              🎯 <b>Coming soon:</b> a ranked ladder you enter with {{ config.TOKEN }}, a weekly prize pool paid to the top players, and burn-to-continue power-ups.
            </p>
          </div>
        </b-col>
      </b-row>
    </b-container>
  </div>
</template>

<script setup>
// Arcade hub — hosts the Bee Invaders game and its account-synced leaderboard.
import BeeInvaders from '~/components/games/BeeInvaders.vue'
import Loading from '@/components/Loading.vue'
import { useAuthStore } from '~/stores/auth'

const config = useRuntimeConfig().public
const auth = useAuthStore()

useHead({ title: 'Arcade' })

const scores = ref([])
const loading = ref(true)

const myUsername = computed(() => (auth.loggedIn ? auth.user.username : null))

const fetchScores = async () => {
  try {
    const res = await $fetch('/api/v1/games/scores', { params: { game: 'bee-invaders' } })
    scores.value = (res && res.scores) || []
  } catch {
    scores.value = []
  } finally {
    loading.value = false
  }
}

// The game component owns the score POST (so it can show the run's rank); it emits
// the fresh top-scores list on success, which we render straight away.
const onSaved = (freshScores) => {
  if (Array.isArray(freshScores)) { scores.value = freshScores }
}

onMounted(fetchScores)
</script>

<style scoped>
.arcade-page { padding: 1.5rem 0 3rem; }
.arc-header { text-align: center; margin-bottom: 1.5rem; }
.arc-title { font-weight: 800; }
.arc-sub { color: var(--w3-muted); max-width: 620px; margin: .3rem auto 0; }

.arc-lb { background: var(--w3-panel); border: 1px solid var(--w3-border); border-radius: 16px; padding: 1.1rem; }
.arc-lb-head { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: .8rem; }
.arc-lb-head h2 { font-size: 1.15rem; font-weight: 800; margin: 0; }
.arc-lb-sub { font-size: .74rem; color: var(--w3-muted); text-transform: uppercase; letter-spacing: .08em; }

.arc-lb-list { list-style: none; margin: 0; padding: 0; }
.arc-lb-row { display: flex; align-items: center; gap: .6rem; padding: .45rem .3rem; border-bottom: 1px solid var(--w3-border); }
.arc-lb-row:last-child { border-bottom: none; }
.arc-lb-row.me { background: rgba(245, 184, 0, .08); border-radius: 8px; }
.arc-rank { width: 26px; text-align: center; font-weight: 800; color: var(--w3-muted); }
.arc-rank.r1 { color: #f5b800; }
.arc-rank.r2 { color: #c8ccd4; }
.arc-rank.r3 { color: #d08a4f; }
.arc-acct { flex: 1; display: flex; align-items: center; gap: .5rem; text-decoration: none; color: var(--w3-text) !important; font-weight: 600; min-width: 0; }
.arc-acct span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.arc-score { font-weight: 800; color: var(--w3-gold); }

.arc-empty { color: var(--w3-muted); text-align: center; padding: 1.2rem 0; }
.arc-note { margin-top: 1rem; font-size: .8rem; color: var(--w3-muted); background: var(--w3-panel-2); border-radius: 10px; padding: .7rem .8rem; line-height: 1.5; }
.mono { font-family: 'JetBrains Mono', monospace; }
</style>
