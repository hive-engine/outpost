<template>
  <b-card class="post-summary">
    <div v-if="type === 'user-feed' && post.author !== user" class="reblog-text">
      <fa-icon icon="redo" /> reblogged
    </div>

    <div v-else-if="type === 'feed' && rebloggedBy.length > 0" class="reblog-text">
      <fa-icon icon="redo" /> <nuxt-link v-for="(reblogger , i) of rebloggedBy" :key="i" :to="{name:'user', params:{user: reblogger}}">
        {{ reblogger }}
      </nuxt-link> reblogged
    </div>

    <b-media>
      <template v-if="thumbnail" #aside>
        <nuxt-link :to="{ name:'user-post', params: { user: post.author, post: post.permlink }}" class="post-thumbnail">
          <picture>
            <source :srcset="largeThumbnail" media="(min-width: 1000px)">
            <source :srcset="mediumThumbnail" media="(max-width: 999px)">
            <img :srcset="thumbnail">
          </picture>
        </nuxt-link>
      </template>

      <div class="d-flex justify-content-between mb-2">
        <div class="d-flex">
          <b-avatar :src="`${$config.IMAGES_CDN}u/${post.author}/avatar`" variant="dark" size="40px" class="mr-2" />

          <div class="d-flex flex-column">
            <div>
              <nuxt-link class="font-weight-bold" :to="{name:'user', params:{user:post.author}}">
                @{{ post.author }}
              </nuxt-link>

              <b-badge variant="info">
                {{ getReputation(post.author) }}
              </b-badge>
            </div>

            <timeago class="small" :datetime="createdAt" :title="createdAt.toLocaleString()" :auto-update="60" />
          </div>
        </div>

        <div v-if="type !== 'comments'" class="text-right">
          <b-badge v-if="post.score_promoted > 0" variant="warning" class="text-uppercase p-2" tag="div">
            Promoted
          </b-badge>

          <b-badge variant="success" class="text-uppercase" tag="div">
            <nuxt-link class="d-inline-block p-1" :to="{name:'sort-tag', params:{sort:'trending', tag: post.parent_permlink}}">
              {{ getCommunity(post.parent_permlink) }}
            </nuxt-link>
          </b-badge>
        </div>
      </div>

      <nuxt-link :to="{ name:'user-post', params: { user: post.author, post: post.permlink }}" class="h6">
        {{ post.title }}
      </nuxt-link>

      <nuxt-link class="text-reset d-block" :to="{ name:'user-post', params: { user: post.author, post: post.permlink }}">
        {{ extractBodySummary(post.desc) }}
      </nuxt-link>
    </b-media>

    <template #footer>
      <div class="d-flex justify-content-between align-items-center">
        <div class="d-flex align-items-center">
          <votes :author="post.author" :permlink="post.permlink" :active-votes="post.active_votes" :rshares="post.vote_rshares" :payout="post.pending_token || post.total_payout_value" />

          <div class="mr-2">
            <nuxt-link class="btn text-nowrap" :to="{name:'user-post', hash:'#comments', params:{ user: post.author, post:post.permlink }}">
              <fa-icon :icon="['far', 'comments']" /> {{ post.children }}
            </nuxt-link>
          </div>

          <extra-actions :type="post.main_post ? 'post':'comment'" :author="post.author" :permlink="post.permlink" :deletable="post.vote_rshares <= 0 && post.children === 0" />
        </div>

        <div v-b-tooltip.hover class="text-nowrap text-truncate" :title="`${post.estimated_payout_value} ${post.token}`">
          {{ post.estimated_payout_value }} {{ post.token }}
        </div>
      </div>
    </template>
  </b-card>
</template>

<script>
import { mapGetters } from 'vuex'
import { proxifyImageUrl } from '@/utils/proxify-url'
import { extractImageLink, extractBodySummary } from '@/utils/extract-content'
import Votes from '@/components/Votes.vue'
import ExtraActions from '@/components/ExtraActions.vue'

export default {
  name: 'PostSummary',

  components: {
    Votes,
    ExtraActions
  },

  props: {
    post: { type: Object, required: true },
    user: { type: String, default: 'null' },
    type: { type: String, default: 'feed' }
  },

  computed: {
    ...mapGetters('scot', ['communities', 'accounts']),

    thumbnail () {
      return extractImageLink(this.post.json_metadata, this.post.desc)
    },

    largeThumbnail () {
      if (!this.thumbnail) { return }

      return proxifyImageUrl(this.thumbnail, '640x480').replace(/ /g, '%20')
    },

    mediumThumbnail () {
      if (!this.thumbnail) { return }

      return proxifyImageUrl(this.thumbnail, '256x512').replace(/ /g, '%20')
    },

    createdAt () {
      return new Date(`${this.post.created}Z`)
    },

    rebloggedBy () {
      if (!this.post.reblogged_by) {
        return []
      }

      return this.post.reblogged_by.filter(r => r !== this.post.author)
    }
  },

  methods: {
    extractBodySummary,

    getCommunity (tag) {
      let parentTag = tag

      if (!parentTag) {
        try {
          parentTag = JSON.parse(this.post.json_metadata).tags[0]
        } catch {

        }
      }

      const community = this.communities[parentTag]

      return community ? community.title : parentTag
    },

    getReputation (author) {
      const account = this.accounts[author]

      return account ? account.reputation : ''
    }
  }
}
</script>

<style>

</style>
