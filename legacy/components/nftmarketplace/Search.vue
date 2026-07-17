<template>
  <div class="search-form">
    <label ref="label" for="search-input" class="search-label">Search...</label>
    <input
      ref="input"
      v-model="searchQuery"
      type="text"
      name="q"
      class="search-input"
      autocomplete="false"
      @focus="searchActive"
      @blur="searchBlured"
      @keyup.enter="search"
    >
    <hr ref="divider" class="divider m-0 p-0">
  </div>
</template>

<script>
export default {
  name: 'SearchInput',

  props: {
    q: { type: String, default: '' }
  },

  data () {
    return {
      searchQuery: '',
      inputActive: false
    }
  },

  created () {
    this.searchQuery = this.q
  },

  mounted () {
    if (this.searchQuery.length > 0) {
      this.searchActive()
    }
  },

  methods: {
    searchActive () {
      this.$refs.label.classList.add('active')
      this.$refs.divider.classList.add('active')
    },

    searchBlured () {
      if (!this.inputActive) {
        this.$refs.label.classList.remove('active')
        this.$refs.divider.classList.remove('active')
      }
    },

    search () {
      if (this.searchQuery.length <= 0) { return }

      this.$router.push({ name: 'nfts-search', query: { q: this.searchQuery } })
    }
  }
}
</script>

<style>

</style>
