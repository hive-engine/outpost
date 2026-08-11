<template>
  <div class="puzzle-page">
    <b-container>
      <div class="pz-header">
        <h1 class="pz-title">🐝 Daily Buzzle</h1>
        <p class="pz-sub">Guess the word in 6 tries. One new word every day — keep your streak alive!</p>
      </div>

      <b-row>
        <b-col lg="7" class="mb-4">
          <div class="pz-card">
            <DailyBuzzle />
          </div>
        </b-col>

        <b-col lg="5">
          <div class="pz-lb">
            <div class="pz-lb-head">
              <h2>🔥 Longest streaks</h2>
            </div>

            <loading v-if="loading" />

            <ol v-else-if="streaks.length" class="pz-lb-list">
              <li v-for="(s, i) in streaks" :key="s.user" class="pz-lb-row" :class="{ me: s.user === myUsername }">
                <span class="pz-rank" :class="`r${i + 1}`">{{ i + 1 }}</span>
                <nuxt-link :to="{ name: 'user', params: { user: s.user } }" class="pz-acct">
                  <b-avatar :src="`${config.IMAGES_CDN}u/${s.user}/avatar`" variant="dark" size="30px" />
                  <span>@{{ s.user }}</span>
                </nuxt-link>
                <span class="pz-streak mono">🔥 {{ s.streak }}<small v-if="s.maxStreak > s.streak"> · best {{ s.maxStreak }}</small></span>
              </li>
            </ol>

            <p v-else class="pz-empty">No streaks yet — solve today's word to start one!</p>

            <p class="pz-note">
              🏆 <b>Coming soon:</b> weekly {{ config.TOKEN }} rewards for the longest streaks, from the arcade pot.
            </p>

            <nuxt-link class="pz-other" :to="{ name: 'arcade' }">🕹️ Play Bee Invaders →</nuxt-link>
          </div>
        </b-col>
      </b-row>
    </b-container>
  </div>
</template>

<script setup>
import DailyBuzzle from '~/components/games/DailyBuzzle.vue'
import Loading from '@/components/Loading.vue'
import { useAuthStore } from '~/stores/auth'

const config = useRuntimeConfig().public
const auth = useAuthStore()

useHead({ title: 'Daily Buzzle' })

const streaks = ref([])
const loading = ref(true)
const myUsername = computed(() => (auth.loggedIn ? auth.user.username : null))

const fetchStreaks = async () => {
  try {
    const res = await $fetch('/api/v1/games/puzzle-leaderboard')
    streaks.value = (res && res.streaks) || []
  } catch { streaks.value = [] } finally { loading.value = false }
}

onMounted(fetchStreaks)
</script>

<style scoped>
.puzzle-page { padding: 1.5rem 0 3rem; }
.pz-header { text-align: center; margin-bottom: 1.5rem; }
.pz-title { font-weight: 800; }
.pz-sub { color: var(--w3-muted); max-width: 560px; margin: .3rem auto 0; }

.pz-card { background: var(--w3-panel); border: 1px solid var(--w3-border); border-radius: 16px; padding: 1.2rem; }

.pz-lb { background: var(--w3-panel); border: 1px solid var(--w3-border); border-radius: 16px; padding: 1.1rem; }
.pz-lb-head h2 { font-size: 1.1rem; font-weight: 800; margin: 0 0 .8rem; }
.pz-lb-list { list-style: none; margin: 0; padding: 0; }
.pz-lb-row { display: flex; align-items: center; gap: .6rem; padding: .45rem .3rem; border-bottom: 1px solid var(--w3-border); }
.pz-lb-row:last-child { border-bottom: none; }
.pz-lb-row.me { background: rgba(245, 184, 0, .08); border-radius: 8px; }
.pz-rank { width: 26px; text-align: center; font-weight: 800; color: var(--w3-muted); }
.pz-rank.r1 { color: #f5b800; } .pz-rank.r2 { color: #c8ccd4; } .pz-rank.r3 { color: #d08a4f; }
.pz-acct { flex: 1; display: flex; align-items: center; gap: .5rem; text-decoration: none; color: var(--w3-text) !important; font-weight: 600; min-width: 0; }
.pz-acct span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pz-streak { font-weight: 800; color: var(--w3-gold); white-space: nowrap; }
.pz-streak small { color: var(--w3-muted); font-weight: 500; }
.pz-empty { color: var(--w3-muted); text-align: center; padding: 1.2rem 0; }
.pz-note { margin-top: 1rem; font-size: .8rem; color: var(--w3-muted); background: var(--w3-panel-2); border-radius: 10px; padding: .7rem .8rem; line-height: 1.5; }
.pz-other { display: block; margin-top: 1rem; text-align: center; font-weight: 700; color: var(--w3-gold) !important; text-decoration: none; }
.mono { font-family: 'JetBrains Mono', monospace; }
</style>
