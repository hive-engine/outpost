<template>
  <b-container fluid="lg">
    <b-card tag="article" class="mt-3">
      <markdown-viewer :text="content.text" />
    </b-card>
  </b-container>
</template>

<script>
import MarkdownViewer from '@/components/MarkdownViewer.vue'

export default {
  name: 'StaticPage',

  components: {
    MarkdownViewer
  },

  head () {
    if (this.content.title) {
      return {
        title: this.content.title
      }
    }
  },

  computed: {
    content () {
      let { default: text } = require(`@/contents/${this.$route.name}.md`)

      const match = text.match(/^---\ntitle: (.+)\n---\n/)

      let title = null

      if (match) {
        title = match[1]

        text = text.replace(match[0], '')
      }

      return {
        title,
        text
      }
    }
  }
}
</script>

<style>

</style>
