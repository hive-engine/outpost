<template>
  <div v-if="trending_tags.length > 0" class="tag-scrolling-wrapper">
    <div class="slider-nav" @click.prevent="scrollLeft">
      <fa-icon icon="angle-left" />
    </div>

    <div ref="scrollingTags" class="scrolling-tags-container">
      <nuxt-link v-for="(tag,i) of trending_tags" :key="i" class="tag-link" :to="{name:'sort-tag', params:{sort, tag}}">
        {{ tag }}
      </nuxt-link>
    </div>

    <div class="slider-nav right" @click.prevent="scrollRight">
      <fa-icon icon="angle-right" />
    </div>
  </div>
</template>

<script>
import { mapGetters } from 'vuex'

export default {
  name: 'TrendingTags',

  props: {
    sort: { type: String, default: 'trending' }
  },

  computed: {
    ...mapGetters('scot', ['trending_tags'])
  },

  methods: {
    scrollLeft () {
      this.$refs.scrollingTags.scrollLeft -= 50
    },

    scrollRight () {
      this.$refs.scrollingTags.scrollLeft += 50
    }
  }
}
</script>

<style>

</style>
