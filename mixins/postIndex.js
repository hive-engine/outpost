import { mapActions } from 'vuex'
import InfiniteLoading from 'vue-infinite-loading'
import PostSummary from '@/components/cards/PostSummary.vue'

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
  },

  beforeDestroy () {
    this.posts = []

    this.$eventBus.$off(['upvote-successful', 'downvote-successful', 'unvote-successful'])
  },

  methods: {
    ...mapActions('scot', ['fetchPosts', 'fetchPost']),
    ...mapActions('user', ['fetchAccountScotData'])
  }
}
