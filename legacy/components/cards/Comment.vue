<template>
  <b-media :id="`${comment.authorperm}`" tag="article">
    <template #aside>
      <b-avatar :src="`${$config.IMAGES_CDN}u/${comment.author}/avatar`" variant="dark" size="32px" />
    </template>

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

        <div v-if="!showReplyEditor" class="d-flex align-items-center small font-weight-bold">
          <votes
            :author="comment.author"
            :permlink="comment.permlink"
            :active-votes="comment.active_votes"
            :rshares="comment.vote_rshares"
            :payout="comment.pending_token || comment.total_payout_value"
            :is-comment="true"
          />

          <payout :post="comment" class="mr-3" />

          <div class="mr-3">
            <a class="cursor-pointer" @click.prevent="showReplyEditor = true">Reply</a>
          </div>

          <div v-if="$auth.loggedIn && $auth.user.username === comment.author" class="mr-3">
            <a class="cursor-pointer" @click.prevent="showCommentEditor = true">Edit</a>
          </div>

          <div v-if="$auth.loggedIn && $auth.user.username === comment.author && comment.children === 0" class="mr-3">
            <a class="cursor-pointer" @click.prevent="requestBroadcastDelete({author:comment.author, permlink:comment.permlink})">Delete</a>
          </div>
        </div>

        <reply-editor v-else :parent-author="comment.author" :parent-permlink="comment.permlink" :cancel="true" :cancel-action="toggleReplyEditor" />
      </template>
    </div>

    <template v-for="(reply, i) of comment.replies">
      <comment :key="i" :permlink="reply" :discussions="discussions" />
    </template>
  </b-media>
</template>

<script>
import { mapGetters, mapActions } from 'vuex'
import Author from '@/components/cards/Author.vue'
import MarkdownViewer from '@/components/MarkdownViewer.vue'
import Comment from '@/components/cards/Comment.vue'
import ReplyEditor from '@/components/ReplyEditor.vue'
import Votes from '@/components/Votes.vue'
import Payout from '@/components/Payout.vue'

export default {
  name: 'Comment',

  components: {
    Author,
    Comment,
    MarkdownViewer,
    ReplyEditor,
    Votes,
    Payout
  },

  props: {
    permlink: { type: String, required: true },
    discussions: { type: Object, required: true }
  },

  data () {
    return {
      showReplyEditor: false,
      showCommentEditor: false
    }
  },

  computed: {
    ...mapGetters(['muting_account']),

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
    ...mapActions('post', ['requestBroadcastDelete']),

    toggleReplyEditor () {
      this.showReplyEditor = !this.showReplyEditor
    },

    toggleCommentEditor () {
      this.showCommentEditor = !this.showCommentEditor
    }
  }
}
</script>

<style>

</style>
