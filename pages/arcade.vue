<template>
  <div class="arcade-page">
    <b-container>
      <div class="arc-header">
        <h1 class="arc-title">🕹️ Arcade</h1>
        <p class="arc-sub">Play, climb the leaderboard, defend the hive. More games — and {{ config.TOKEN }} prizes — coming soon.</p>
        <nuxt-link class="arc-other" :to="{ name: 'puzzle' }">🐝 New: play the Daily Buzzle →</nuxt-link>
      </div>

      <b-row>
        <b-col lg="7" class="mb-4">
          <BeeInvaders @saved="onSaved" />
        </b-col>

        <b-col lg="5">
          <div class="arc-lb">
            <div class="arc-lb-head">
              <h2>🐝 Bee Invaders</h2>
            </div>

            <div class="arc-tabs">
              <button class="arc-tab" :class="{ active: board === 'ranked' }" @click="board = 'ranked'">🏆 This week</button>
              <button class="arc-tab" :class="{ active: board === 'casual' }" @click="board = 'casual'">🎮 All-time</button>
            </div>

            <loading v-if="loading" />

            <ol v-else-if="rows.length" class="arc-lb-list">
              <li v-for="(s, i) in rows" :key="s.user" class="arc-lb-row" :class="{ podium: i < 3, me: s.user === myUsername }">
                <span class="arc-rank" :class="`r${i + 1}`">{{ i + 1 }}</span>
                <nuxt-link :to="{ name: 'user', params: { user: s.user } }" class="arc-acct">
                  <b-avatar :src="`${config.IMAGES_CDN}u/${s.user}/avatar`" variant="dark" size="30px" />
                  <span>@{{ s.user }}</span>
                </nuxt-link>
                <span class="arc-score mono">{{ s.score.toLocaleString() }}</span>
              </li>
            </ol>

            <p v-else class="arc-empty">
              {{ board === 'ranked' ? 'No ranked runs yet this week — enter and take the top spot!' : 'No scores yet — be the first to make the board!' }}
            </p>

            <p class="arc-note">
              🏆 <b>Ranked:</b> 0.1 {{ config.TOKEN }} entry (1 free/day). Every week the top 10 split the pot; 10% of entries are burned. Weekly winners are shown here.
            </p>

            <div v-if="winners" class="arc-winners">
              <div class="arc-winners-head">🏅 Last week's winners <span class="mono">· {{ winners.week }}</span></div>
              <div class="arc-winners-pot">Pot <b class="mono">{{ Number(winners.pot).toFixed(2) }} {{ config.TOKEN }}</b> · burned <span class="mono">{{ Number(winners.burned).toFixed(2) }}</span></div>
              <ol class="arc-winners-list">
                <li v-for="w in winners.winners" :key="w.user">
                  <span class="arc-rank" :class="`r${w.rank}`">{{ w.rank }}</span>
                  <nuxt-link :to="{ name: 'user', params: { user: w.user } }">@{{ w.user }}</nuxt-link>
                  <span class="arc-score mono">{{ Number(w.amount).toFixed(3) }} {{ config.TOKEN }}</span>
                </li>
              </ol>
            </div>
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

const boards = ref({ ranked: [], casual: [] })
const board = ref('ranked')
const loading = ref(true)
const winners = ref(null)

const rows = computed(() => boards.value[board.value] || [])
const myUsername = computed(() => (auth.loggedIn ? auth.user.username : null))

const fetchBoard = async (which) => {
  try {
    const res = await $fetch('/api/v1/games/scores', { params: { game: 'bee-invaders', board: which } })
    boards.value[which] = (res && res.scores) || []
  } catch {
    boards.value[which] = []
  }
}

const fetchScores = async () => {
  loading.value = true
  await Promise.all([fetchBoard('ranked'), fetchBoard('casual')])
  loading.value = false
}

const fetchWinners = async () => {
  try {
    const res = await $fetch('/api/v1/games/winners', { params: { game: 'bee-invaders' } })
    winners.value = (res && res.latest) || null
  } catch { winners.value = null }
}

// The game component owns the score POST (so it can show the run's rank); it emits
// the fresh top-scores list on success. Refresh whichever board it landed on.
const onSaved = () => { fetchScores() }

onMounted(async () => {
  await Promise.all([fetchScores(), fetchWinners()])
  // Land on a populated board: if nobody's played Ranked this week yet, show the
  // all-time board so there's always a visible ranking.
  if (!boards.value.ranked.length && boards.value.casual.length) { board.value = 'casual' }
})
</script>

<style scoped>
.arcade-page { padding: 1.5rem 0 3rem; }
.arc-header { text-align: center; margin-bottom: 1.5rem; }
.arc-title { font-weight: 800; }
.arc-sub { color: var(--w3-muted); max-width: 620px; margin: .3rem auto 0; }
.arc-other { display: inline-block; margin-top: .5rem; font-weight: 700; color: var(--w3-gold) !important; text-decoration: none; }

.arc-lb { background: var(--w3-panel); border: 1px solid var(--w3-border); border-radius: 16px; padding: 1.1rem; }
.arc-lb-head { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: .8rem; }
.arc-lb-head h2 { font-size: 1.15rem; font-weight: 800; margin: 0; }
.arc-lb-sub { font-size: .74rem; color: var(--w3-muted); text-transform: uppercase; letter-spacing: .08em; }

.arc-tabs { display: flex; gap: .4rem; margin-bottom: .8rem; }
.arc-tab {
  flex: 1;
  border: 1px solid var(--w3-border);
  background: transparent;
  color: var(--w3-muted);
  border-radius: 999px;
  padding: .35rem .6rem;
  font-weight: 700;
  font-size: .82rem;
  cursor: pointer;
}
.arc-tab.active { background: var(--w3-gold, #f5b800); color: #1a1206; border-color: transparent; }

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

.arc-winners { margin-top: 1rem; border-top: 1px solid var(--w3-border); padding-top: .9rem; }
.arc-winners-head { font-weight: 800; font-size: .95rem; }
.arc-winners-head .mono { color: var(--w3-muted); font-weight: 500; font-size: .8rem; }
.arc-winners-pot { font-size: .8rem; color: var(--w3-muted); margin: .2rem 0 .5rem; }
.arc-winners-list { list-style: none; margin: 0; padding: 0; }
.arc-winners-list li { display: flex; align-items: center; gap: .5rem; padding: .28rem .2rem; font-size: .88rem; }
.arc-winners-list a { flex: 1; color: var(--w3-text) !important; text-decoration: none; font-weight: 600; }

.arc-empty { color: var(--w3-muted); text-align: center; padding: 1.2rem 0; }
.arc-note { margin-top: 1rem; font-size: .8rem; color: var(--w3-muted); background: var(--w3-panel-2); border-radius: 10px; padding: .7rem .8rem; line-height: 1.5; }
.mono { font-family: 'JetBrains Mono', monospace; }
</style>
