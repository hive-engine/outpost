<template>
  <article :id="`${comment.authorperm}`" class="media">
    <div class="media-aside align-self-start">
      <b-avatar :src="`${config.IMAGES_CDN}u/${comment.author}/avatar`" variant="dark" size="32px" />
    </div>

    <div class="media-body">
      <div class="comment">
        <author :author="comment.author" :reputation="comment.author_reputation" />

        <timeago class="small" :datetime="createdAt" :title="createdAt.toLocaleString()" :auto-update="60" />
        <template v-if="createdAt.getTime() !== updatedAt.getTime()">
          (<span v-b-tooltip.hover class="small" :title="updatedAt.toLocaleString()">Edited</span>)
        </template>

        <template v-if="showCommentEditor">
          <reply-editor
            :parent-author="comment.parent_author"
            :parent-permlink="comment.parent_permlink"
            :comment-body="comment.body"
            :comment-permlink="comment.permlink"
            :comment-tags="comment.json_metadata.tags"
            :cancel="true"
            :cancel-action="toggleCommentEditor"
          />
        </template>

        <template v-else>
          <markdown-viewer :text="comment.body" />

          <div v-if="!showReplyEditor" class="d-flex align-items-center small fw-bold">
            <votes
              :author="comment.author"
              :permlink="comment.permlink"
              :active-votes="comment.active_votes"
              :rshares="comment.vote_rshares"
              :payout="comment.pending_token || comment.total_payout_value"
              :is-comment="true"
            />

            <payout :post="comment" class="me-3" />

            <div class="me-3">
              <a class="cursor-pointer" @click.prevent="showReplyEditor = true">Reply</a>
            </div>

            <div v-if="auth.loggedIn && auth.user.username === comment.author" class="me-3">
              <a class="cursor-pointer" @click.prevent="showCommentEditor = true">Edit</a>
            </div>

            <div v-if="auth.loggedIn && auth.user.username === comment.author && comment.children === 0" class="me-3">
              <a class="cursor-pointer" @click.prevent="requestBroadcastDelete({author:comment.author, permlink:comment.permlink})">Delete</a>
            </div>
          </div>

          <reply-editor v-else :parent-author="comment.author" :parent-permlink="comment.permlink" :cancel="true" :cancel-action="toggleReplyEditor" />
        </template>
      </div>

      <template v-for="(reply, i) of comment.replies" :key="i">
        <comment :permlink="reply" :discussions="discussions" />
      </template>
    </div>
  </article>
</template>

<script>
// Ported from legacy/components/cards/Comment.vue.
// - <b-media tag="article"> → plain BS4 media markup (bootstrap-vue-next has no
//   BMedia; .media/.media-aside/.media-body are styled by the app scss).
// - Recursion: the self-import is dropped — Vue 3 resolves <comment> through the
//   component's own `name` option.
// - Vuex: root muting_account → useTribeStore, post actions → usePostStore.
// - $config/$auth → setup(); <timeago> → local Timeago drop-in; BS5 mr-*→me-*,
//   font-weight-bold → fw-bold.
// TODO(P4): ReplyEditor (legacy/components/ReplyEditor.vue) is not ported yet —
// this import resolves once the editors batch lands.
import { mapState, mapActions } from 'pinia'
import Author from '@/components/cards/Author.vue'
import MarkdownViewer from '@/components/MarkdownViewer.vue'
import ReplyEditor from '@/components/ReplyEditor.vue'
import Votes from '@/components/Votes.vue'
import Payout from '@/components/Payout.vue'
import Timeago from '~/components/app/Timeago.vue'
import { useAuthStore } from '~/stores/auth'
import { useTribeStore } from '~/stores/tribe'
import { usePostStore } from '~/stores/post'

export default {
  name: 'Comment',

  components: {
    Author,
    MarkdownViewer,
    ReplyEditor,
    Votes,
    Payout,
    Timeago
  },

  props: {
    permlink: { type: String, required: true },
    discussions: { type: Object, required: true }
  },

  setup () {
    const config = useRuntimeConfig().public
    const auth = useAuthStore()

    return { config, auth }
  },

  data () {
    return {
      showReplyEditor: false,
      showCommentEditor: false
    }
  },

  computed: {
    ...mapState(useTribeStore, ['muting_account']),

    comment () {
      return this.discussions[this.permlink]
    },

    createdAt () {
      return new Date(`${this.comment.created}Z`)
    },

    updatedAt () {
      return new Date(`${this.comment.updated}Z`)
    }
  },

  methods: {
    ...mapActions(usePostStore, ['requestBroadcastDelete']),

    toggleReplyEditor () {
      this.showReplyEditor = !this.showReplyEditor
    },

    toggleCommentEditor () {
      this.showCommentEditor = !this.showCommentEditor
    }
  }
}
</script>
