<template>
  <div class="reply-editor">
    <client-only>
      <mavon-editor
        ref="mavonEditor"
        v-model="body"
        class="mb-3"
        language="en"
        default-open="edit"
        :toolbars="toolbarOptions"
        :ishljs="false"
        :subfield="false"
        :box-shadow="false"
        :autofocus="autofocus"
        placeholder=" "
        @imgAdd="imgAdd"
      />

      <div class="text-right">
        <b-button v-if="cancel" variant="secondary" @click.prevent="cancelAction">
          <fa-icon icon="times" /> Cancel
        </b-button>

        <b-button variant="primary" :disabled="body.length <= 0" @click.prevent="requestReply">
          <fa-icon icon="comment-alt" /> {{ commentPermlink === '' ? 'Reply' : 'Edit' }}
        </b-button>
      </div>
    </client-only>

    <template v-if="body.length > 0">
      <h6>Preview</h6>

      <markdown-viewer :text="body" class="border p-2" />
    </template>
  </div>
</template>

<script>
import { mapActions } from 'vuex'
import { Remarkable } from 'remarkable'
import sanitize from 'sanitize-html'
import HtmlReady from '@/utils/HtmlReady'
import { escapeHTML, isHtmlTest, allTags } from '@/utils'
import sanitizeConfig, { allowedTags } from '@/utils/sanitize-config'
import MarkdownViewer from '@/components/MarkdownViewer.vue'

const remarkable = new Remarkable({ html: true, breaks: true })

export default {
  name: 'ReplyEditor',

  components: {
    MarkdownViewer
  },

  props: {
    parentAuthor: { type: String, required: true },
    parentPermlink: { type: String, required: true },
    commentPermlink: { type: String, default: '' },
    commentBody: { type: String, default: '' },
    commentTags: { type: Array, default: () => [] },
    autofocus: { type: Boolean, default: true },
    cancel: { type: Boolean, default: false },
    cancelAction: { type: Function, default: () => {} }
  },

  data () {
    return {
      body: '',
      toolbarOptions: {
        bold: true,
        italic: true,
        header: true,
        strikethrough: false,
        quote: true,
        ol: true,
        ul: true,
        link: true,
        imagelink: true,
        code: false,
        table: false,
        htmlcode: false,
        help: false,
        undo: false,
        redo: false,
        subfield: false,
        preview: false
      },

      multipleImageUploader: null,
      awaitingUpload: false,
      images: []
    }
  },

  created () {
    this.body = this.commentBody
  },

  mounted () {
    const self = this

    this.multipleImageUploader = setInterval(async () => {
      if (self.images.length > 0 && !this.awaitingUpload) {
        this.awaitingUpload = true

        await self.uploadMultipleImages()

        this.awaitingUpload = false
      }
    }, 1000)

    this.$eventBus.$on(['comment-publish-successful', 'comment-edit-successful'], () => {
      self.body = ''

      self.cancelAction()
    })
  },

  beforeDestroy () {
    clearInterval(this.multipleImageUploader)

    this.$eventBus.$off(['comment-publish-successful', 'comment-edit-successful'])
  },

  methods: {
    ...mapActions('user', ['uploadFile']),
    ...mapActions('post', ['requestBroadcastPost']),

    requestReply () {
      const { body } = this

      const isHtml = isHtmlTest(body)

      const html = isHtml ? body : remarkable.render(body)
      const rtags = HtmlReady(html, { mutate: false })

      allowedTags.forEach((tag) => {
        rtags.htmltags.delete(tag)
      })

      if (isHtml) { rtags.htmltags.delete('html') }

      if (rtags.htmltags.size) {
        return this.$notify({
          title: 'Error',
          type: 'error',
          text: `Please remove the following HTML elements from your comment: ${Array.from(rtags.htmltags).map(tag => escapeHTML(`<${tag}>`)).join(', ')}`
        })
      }

      const meta = {}

      const metaTags = allTags(this.commentTags, '', rtags.hashtags, this.commentPermlink !== '', true)

      if (metaTags.size) {
        meta.tags = Array.from(metaTags)
      } else {
        delete meta.tags
      }

      meta.format = isHtml ? 'html' : 'markdown'

      const sanitizeErrors = []

      sanitize(body, sanitizeConfig({ sanitizeErrors }))

      if (sanitizeErrors.length) {
        return this.$notify({
          title: 'Error',
          type: 'error',
          text: sanitizeErrors.join('.  ')
        })
      }

      const permlink = this.commentPermlink === '' ? `re-${this.parentAuthor}-${Date.now().toString(36)}` : this.commentPermlink

      this.requestBroadcastPost({
        title: '',
        permlink,
        body,
        parent_author: this.parentAuthor,
        parent_permlink: this.parentPermlink,
        metadata: meta,
        payout_type: 'regular',
        beneficiaries: [],
        post_type: 'comment',
        edit: this.commentPermlink !== ''
      })
    },

    imgAdd (pos, file) {
      this.images.push([pos, file])
    },

    async uploadMultipleImages () {
      for (const image of this.images) {
        const [pos, file] = image

        const url = await this.uploadFile(file)

        if (url) {
          this.$refs.mavonEditor.$img2Url(pos, url)
        } else {
          this.$refs.mavonEditor.$refs.toolbar_left.$imgDelByFilename(file.name)
        }
      }

      this.images = []
    }
  }
}
</script>

<style>

</style>
