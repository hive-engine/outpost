<template>
  <div class="search-page">
    <b-container>
      <div class="s-head">
        <h1 class="s-title"><fa-icon icon="search" /> Search</h1>
      </div>

      <div class="s-box">
        <b-form-input
          v-model="q"
          placeholder="Search people, tags, posts…"
          autofocus
          @keyup.enter="run"
        />
      </div>

      <loading v-if="loading" />

      <template v-else-if="q.trim()">
        <div v-if="accounts.length" class="s-section">
          <h6 class="s-section-title">People</h6>
          <nuxt-link v-for="a in accounts" :key="a" :to="{ name: 'user', params: { user: a } }" class="s-acct">
            <b-avatar :src="`${config.IMAGES_CDN}u/${a}/avatar`" variant="dark" size="34px" />
            <span>@{{ a }}</span>
          </nuxt-link>
        </div>

        <div v-if="tag" class="s-section">
          <h6 class="s-section-title">Tag</h6>
          <nuxt-link :to="{ name: 'sort-tag', params: { sort: 'created', tag } }" class="s-tag">#{{ tag }} — view posts →</nuxt-link>
        </div>

        <div v-if="posts.length" class="s-section">
          <h6 class="s-section-title">Posts</h6>
          <nuxt-link v-for="p in posts" :key="`${p.author}/${p.permlink}`" :to="{ name: 'user-post', params: { user: p.author, post: p.permlink } }" class="s-post">
            <span class="s-post-title">{{ p.title || p.permlink }}</span>
            <span class="s-post-meta">@{{ p.author }}</span>
          </nuxt-link>
        </div>

        <div v-if="!accounts.length && !posts.length && !tag" class="s-empty">
          No results for “{{ q.trim() }}”.
        </div>
      </template>

      <div v-else class="s-empty">Type to search people, tags and posts.</div>
    </b-container>
  </div>
</template>

<script setup>
// Search — free account lookup (condenser_api.lookup_accounts) + tag jump, plus
// full-text post results when the HiveSearcher key (HS_API_KEY) is configured
// server-side (/api/v1/search). Debounced as you type.
import Loading from '@/components/Loading.vue'

const config = useRuntimeConfig().public
const route = useRoute()
const router = useRouter()
const { $chain } = useNuxtApp()

useHead({ title: 'Search' })

const q = ref(route.query.q || '')
const accounts = ref([])
const posts = ref([])
const loading = ref(false)
let timer = null

const tag = computed(() => {
  const t = q.value.trim().toLowerCase().replace(/^#/, '')
  return /^[a-z0-9-]{2,24}$/.test(t) ? t : ''
})

async function search () {
  const query = q.value.trim()
  if (!query) { accounts.value = []; posts.value = []; return }

  loading.value = true

  // People (free, prefix match)
  try {
    accounts.value = await $chain.getClient().call('condenser_api', 'lookup_accounts', [query.toLowerCase().replace(/^@/, ''), 8])
  } catch { accounts.value = [] }

  // Posts (full-text) — only returns when HS_API_KEY is set; errors are ignored.
  try {
    const res = await $fetch('/api/v1/search', { method: 'POST', body: { query } })
    const results = (res && (res.results || res)) || []
    posts.value = Array.isArray(results) ? results.slice(0, 12).map(r => ({ author: r.author, permlink: r.permlink, title: r.title })).filter(p => p.author && p.permlink) : []
  } catch { posts.value = [] }

  loading.value = false
}

function run () {
  router.replace({ query: q.value ? { q: q.value } : {} })
  search()
}

watch(q, () => { clearTimeout(timer); timer = setTimeout(search, 350) })
onMounted(() => { if (q.value) { search() } })
</script>

<style scoped>
.search-page { max-width: 640px; margin: 0 auto; padding: 0 clamp(.8rem, 3vw, 1.4rem) 4rem; }
.s-head { padding: 1.6rem 0 .8rem; }
.s-title {
  font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 1.8rem; margin: 0;
  background: linear-gradient(135deg, var(--w3-gold), #ffd34d); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
}
.s-box { margin-bottom: 1.2rem; }
.s-section { margin-bottom: 1.4rem; }
.s-section-title { color: var(--w3-muted); text-transform: uppercase; font-size: .72rem; letter-spacing: .05em; margin-bottom: .5rem; }
.s-acct, .s-post {
  display: flex; align-items: center; gap: .7rem;
  padding: .6rem .3rem; border-bottom: 1px solid var(--w3-border);
  text-decoration: none; color: var(--w3-text);
}
.s-acct:hover, .s-post:hover { background: rgba(255, 255, 255, .02); color: var(--w3-gold); }
.s-acct span { font-weight: 600; }
.s-post { flex-direction: column; align-items: flex-start; gap: .1rem; }
.s-post-title { font-weight: 600; }
.s-post-meta { color: var(--w3-muted); font-size: .8rem; }
.s-tag { color: var(--w3-gold); font-weight: 700; text-decoration: none; }
.s-tag:hover { text-decoration: underline; }
.s-empty { text-align: center; color: var(--w3-muted); padding: 2.5rem 1rem; }
</style>
