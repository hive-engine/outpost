<template>
  <b-container fluid="lg">
    <b-card tag="article" class="mt-3">
      <markdown-viewer :text="content.text" />
    </b-card>
  </b-container>
</template>

<script setup>
// Renders a markdown file from ~/contents as a static page (faq, tos, ...).
// Replaces legacy static.vue; used by the explicit per-file pages so the single
// root segment isn't a catch-all that shadows /:sort.
const props = defineProps({ slug: { type: String, required: true } })

const files = import.meta.glob('~/contents/*.md', { query: '?raw', import: 'default', eager: true })

const key = Object.keys(files).find(p => p.endsWith(`/${props.slug}.md`))
const raw = key ? files[key] : null

if (!raw) {
  throw createError({ statusCode: 404, statusMessage: 'Page not found' })
}

const content = computed(() => {
  let text = raw
  const match = text.match(/^---\ntitle: (.+)\n---\n/)
  let title = null
  if (match) { title = match[1]; text = text.replace(match[0], '') }
  return { title, text }
})

useHead(() => (content.value.title ? { title: content.value.title } : {}))
</script>
