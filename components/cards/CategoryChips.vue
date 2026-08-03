<template>
  <div v-if="chips.length" class="cat-chips">
    <nuxt-link
      v-for="c in chips"
      :key="c.label"
      class="cat-chip"
      :class="{ active: isActive(c) }"
      :to="linkFor(c)"
    >
      {{ c.label }}
    </nuxt-link>
  </div>
</template>

<script setup>
// Quick topic filters on the feeds. Each chip links to that tag's feed within the
// tribe; the 'All' chip (empty tag) clears the filter. List comes from
// config.CATEGORY_CHIPS. Keeps the current sort (trending/hot/created).
const config = useRuntimeConfig().public
const route = useRoute()

const chips = config.CATEGORY_CHIPS || []

const sort = computed(() => route.params.sort || 'trending')
const currentTag = computed(() => route.params.tag || '')

const isActive = c => (c.tag || '') === currentTag.value

const linkFor = c => (c.tag
  ? { name: 'sort-tag', params: { sort: sort.value, tag: c.tag } }
  : { name: 'sort', params: { sort: sort.value } })
</script>

<style scoped>
.cat-chips {
  display: flex;
  gap: .5rem;
  overflow-x: auto;
  padding: .2rem 0 .5rem;
  scrollbar-width: none;
}
.cat-chips::-webkit-scrollbar { display: none; }

.cat-chip {
  flex: 0 0 auto;
  padding: .32rem .95rem;
  border-radius: 999px;
  border: 1px solid var(--w3-border);
  background: var(--w3-panel);
  color: var(--w3-muted);
  font-weight: 700;
  font-size: .82rem;
  text-decoration: none;
  white-space: nowrap;
  transition: color .15s ease, border-color .15s ease, background .15s ease;
}
.cat-chip:hover { color: var(--w3-text); border-color: var(--w3-gold); }
.cat-chip.active {
  color: #1a1206;
  background: linear-gradient(135deg, var(--w3-gold), #ffd34d);
  border-color: transparent;
}
</style>
