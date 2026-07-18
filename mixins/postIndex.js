// Ported from legacy/mixins/postIndex.js (kept as a mixin — Options API pages use it).
// Vuex → Pinia (scot → useScotStore, user → useUserStore); vue-infinite-loading →
// ~/components/app/InfiniteLoading.vue (same :identifier/@infinite/$state contract);
// beforeDestroy → beforeUnmount. `sleep` came from the legacy global-mixins plugin
// (not ported) → inlined below.
// NOTE: ~/components/cards/PostSummary.vue is not ported yet — pages using this mixin
// will fail to resolve the import until the cards batch lands.
import { mapActions } from 'pinia'
import InfiniteLoading from '~/components/app/InfiniteLoading.vue'
import PostSummary from '~/components/cards/PostSummary.vue'
import { useScotStore } from '~/stores/scot'
import { useUserStore } from '~/stores/user'

export default {

  components: {
    InfiniteLoading,
    PostSummary
  },

  data () {
    return {
      infiniteId: 1,
      posts: []
    }
  },

  mounted () {
    const self = this

    this.$eventBus.$on(['upvote-successful', 'downvote-successful', 'unvote-successful'], async ({ type, author, permlink, weight }) => {
      if (type === 'post') {
        const posts = self.posts.slice()

        const index = posts.findIndex(p => p.author === author && p.permlink === permlink)

        if (index) {
          await self.sleep(30 * 1000)

          const [post] = await Promise.all([
            self.fetchPost({ author, permlink }),
            self.fetchAccountScotData()
          ])

          posts.splice(index, 1, post)

          self.posts = posts

          this.$eventBus.$emit('vote-acknowledgement', { type, author, permlink, weight })
        }
      }
    })

    this.$eventBus.$on('post-promotion-successful', ({ memo }) => {
      self.$notify({
        title: 'Success',
        type: 'success',
        text: `Successfully promoted ${memo}`
      })
    })
  },

  beforeUnmount () {
    this.posts = []

    this.$eventBus.$off(['upvote-successful', 'downvote-successful', 'unvote-successful'])
    this.$eventBus.$off('post-promotion-successful')
  },

  methods: {
    ...mapActions(useScotStore, ['fetchPosts', 'fetchPost']),
    ...mapActions(useUserStore, ['fetchAccountScotData']),

    // Legacy global mixin helper (legacy/plugins/global-mixins.js), inlined
    sleep (ms) {
      return new Promise(resolve => setTimeout(resolve, ms))
    }
  }
}
