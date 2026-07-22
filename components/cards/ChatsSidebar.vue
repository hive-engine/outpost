<template>
  <aside class="chats-aside">
    <!-- live Hive widget -->
    <div class="aside-card live-card">
      <div class="live-head">
        <span class="live-dot" /> Live on Hive
      </div>

      <client-only>
        <div class="live-grid">
          <div class="live-stat">
            <div class="live-label">Block</div>
            <div class="live-value mono">{{ blockDisplay }}</div>
          </div>
          <div class="live-stat">
            <div class="live-label">HBD APR</div>
            <div class="live-value mono">{{ apr }}</div>
          </div>
        </div>
        <template #fallback>
          <div class="live-grid">
            <div class="live-stat"><div class="live-label">Block</div><div class="live-value mono">—</div></div>
            <div class="live-stat"><div class="live-label">HBD APR</div><div class="live-value mono">—</div></div>
          </div>
        </template>
      </client-only>
    </div>

    <!-- trending tags -->
    <div v-if="tags.length" class="aside-card">
      <div class="aside-title">Trending topics</div>
      <div class="aside-tags">
        <nuxt-link
          v-for="tag of tags"
          :key="tag"
          class="aside-tag"
          :to="{ name: 'sort-tag', params: { sort: 'trending', tag } }"
        >#{{ tag }}</nuxt-link>
      </div>
    </div>

    <!-- CTA -->
    <div v-if="!auth.loggedIn" class="aside-card cta-card">
      <div class="cta-title">Join the conversation</div>
      <p class="cta-text">Log in with Hive Keychain to post Chats, upvote and reply.</p>
      <nuxt-link class="cta-btn" :to="{ name: 'login' }">Log in</nuxt-link>
    </div>

    <div class="aside-foot">
      Chats run on the Hive blockchain — your posts are yours, forever.
    </div>
  </aside>
</template>

<script setup>
// Right rail for /chats: a live Hive network widget (head block ticking + HBD
// APR, client-only to avoid hydration drift) and trending topic chips.
import { useAuthStore } from '~/stores/auth'
import { useScotStore } from '~/stores/scot'

const auth = useAuthStore()
const scot = useScotStore()
const { $chain } = useNuxtApp()

const block = ref(0)
const aprRaw = ref(null)
let timer = null

const blockDisplay = computed(() => (block.value ? block.value.toLocaleString() : '—'))
const apr = computed(() => (aprRaw.value != null ? `${(aprRaw.value / 100).toFixed(2)}%` : '—'))
const tags = computed(() => (scot.trending_tags || []).slice(0, 12))

async function refresh () {
  try {
    const props = await $chain.getClient().database.getDynamicGlobalProperties()
    block.value = props.head_block_number
    aprRaw.value = props.hbd_interest_rate
  } catch {
    // leave last-known values
  }
}

onMounted(() => {
  refresh()
  timer = setInterval(refresh, 3000)
  if (!scot.trending_tags || scot.trending_tags.length === 0) { scot.fetchTrendingTags() }
})

onBeforeUnmount(() => { if (timer) { clearInterval(timer) } })
</script>

<style scoped>
.chats-aside {
  position: sticky;
  top: 84px;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.aside-card {
  background: var(--w3-panel);
  border: 1px solid var(--w3-border);
  border-radius: 16px;
  padding: 1.1rem 1.2rem;
  backdrop-filter: blur(10px);
}

.live-card {
  background:
    radial-gradient(120% 100% at 0% 0%, rgba(245, 184, 0, .08), transparent 60%),
    var(--w3-panel);
}
.live-head {
  display: flex;
  align-items: center;
  gap: .5rem;
  font-weight: 700;
  font-size: .8rem;
  letter-spacing: .06em;
  text-transform: uppercase;
  color: var(--w3-muted);
  margin-bottom: .9rem;
}
.live-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  background: #2ecc71;
  box-shadow: 0 0 0 0 rgba(46, 204, 113, .6);
  animation: livePulse 1.8s infinite;
}
@keyframes livePulse {
  0% { box-shadow: 0 0 0 0 rgba(46, 204, 113, .5); }
  70% { box-shadow: 0 0 0 7px rgba(46, 204, 113, 0); }
  100% { box-shadow: 0 0 0 0 rgba(46, 204, 113, 0); }
}
.live-grid { display: grid; grid-template-columns: 1fr 1fr; gap: .8rem; }
.live-label { font-size: .72rem; color: var(--w3-muted); text-transform: uppercase; letter-spacing: .04em; }
.live-value { font-size: 1.15rem; font-weight: 700; color: var(--w3-text); margin-top: .15rem; }

.aside-title {
  font-weight: 700;
  font-size: 1.05rem;
  color: var(--w3-text);
  margin-bottom: .8rem;
}
.aside-tags { display: flex; flex-wrap: wrap; gap: .45rem; }
.aside-tag {
  font-size: .82rem;
  font-weight: 600;
  color: var(--w3-muted);
  text-decoration: none;
  padding: .3rem .7rem;
  border-radius: 999px;
  background: var(--w3-panel-2);
  border: 1px solid var(--w3-border);
  transition: all .15s ease;
}
.aside-tag:hover {
  color: #1a1206;
  background: linear-gradient(135deg, var(--w3-gold), #ffd34d);
  border-color: transparent;
}

.cta-card {
  background:
    radial-gradient(120% 100% at 100% 0%, rgba(224, 31, 38, .12), transparent 60%),
    var(--w3-panel);
}
.cta-title { font-weight: 700; font-size: 1.1rem; color: var(--w3-text); }
.cta-text { color: var(--w3-muted); font-size: .88rem; margin: .4rem 0 .9rem; }
.cta-btn {
  display: inline-block;
  padding: .5rem 1.3rem;
  border-radius: 999px;
  font-weight: 700;
  text-decoration: none;
  color: #1a1206;
  background: linear-gradient(135deg, var(--w3-gold), #ffd34d);
  transition: transform .15s ease;
}
.cta-btn:hover { transform: translateY(-1px); }

.aside-foot {
  font-size: .78rem;
  color: var(--w3-muted);
  line-height: 1.5;
  padding: 0 .3rem;
}
</style>
