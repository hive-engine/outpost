<template>
  <div v-if="false" class="tag-scrolling-wrapper">
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
// Ported from legacy/components/cards/TrendingTags.vue.
// Vuex mapGetters('scot', ['trending_tags']) → Pinia mapState(useScotStore).
// Note: legacy template is wrapped in v-if="false" (component is disabled
// upstream) — kept as-is for a mechanical port.
import { mapState } from 'pinia'
import { useScotStore } from '~/stores/scot'

export default {
  name: 'TrendingTags',

  props: {
    sort: { type: String, default: 'trending' }
  },

  computed: {
    ...mapState(useScotStore, ['trending_tags'])
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
