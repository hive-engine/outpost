<template>
  <div class="create-post">
    <b-container fluid>
      <template v-if="loading">
        <loading />
      </template>

      <template v-else>
        <b-row>
          <b-col class="mt-5" lg="6">
            <b-alert variant="danger" :show="v$.$anyDirty && v$.$invalid" dismissible>
              <ul class="list-unstyled m-0">
                <li v-if="v$.title.required.$invalid">
                  Post title is required.
                </li>
                <li v-if="v$.title.noMarkdown.$invalid">
                  Post title should not contain markdown.
                </li>

                <li v-if="v$.body.required.$invalid">
                  Post content is required.
                </li>
                <li v-if="v$.body.validateSize.$invalid">
                  Post content should not exceed 64 kilobytes.
                </li>

                <li v-if="v$.permlink.required.$invalid">
                  Permlink is required.
                </li>
                <li v-if="v$.permlink.maxLength.$invalid">
                  Permlink should not exceed 255 charaters.
                </li>

                <li v-if="v$.author.validUsername.$invalid">
                  Author must be a valid username.
                </li>

                <li v-if="v$.tags.required.$invalid">
                  At least one tag is required.
                </li>

                <li v-if="v$.tags.firstTag.$invalid">
                  The first tag can not be changed.
                </li>
              </ul>
            </b-alert>

            <b-card class="h-100">
              <b-card-title>
                <template v-if="isEditing">
                  Editing <div class="d-inline-block small text-muted">
                    (@{{ post.author }}/{{ permlink }})
                  </div>
                </template>

                <template v-else>
                  Write a post
                </template>
              </b-card-title>

              <div v-if="!isEditing" class="drafts-bar">
                <b-button size="sm" variant="secondary" :disabled="!hasContent" @click.prevent="saveDraft">
                  <fa-icon icon="check" v-if="draftSaved" /> {{ draftSaved ? 'Saved!' : 'Save draft' }}
                </b-button>

                <b-dropdown v-if="drafts.length" size="sm" variant="link" no-caret>
                  <template #button-content>
                    <fa-icon icon="list" /> Drafts ({{ drafts.length }})
                  </template>
                  <b-dropdown-item v-for="d in drafts" :key="d.id" @click.prevent="applyDraft(d)">
                    <div class="draft-item">
                      <span class="draft-title">{{ d.title || 'Untitled draft' }}</span>
                      <span class="draft-time">{{ draftAgo(d.savedAt) }}</span>
                      <a class="draft-del" title="Delete draft" @click.stop.prevent="deleteDraft(d.id)">✕</a>
                    </div>
                  </b-dropdown-item>
                </b-dropdown>

                <span v-if="autoSavedAt" class="draft-auto">Auto-saved {{ draftAgo(autoSavedAt) }}</span>
              </div>

              <b-form-group label="Title" label-sr-only>
                <b-form-input v-model="title" placeholder="Post title…" class="post-title-input" />
              </b-form-group>

              <div class="post-editor">
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
                    placeholder=" "
                    @imgAdd="imgAdd"
                  />
                </client-only>
              </div>

              <b-form-group label="Summary" label-sr-only description="Post summary for post previews and SEO. Maximum 140 characters.">
                <b-form-input v-model.trim="summary" placeholder="Summary" />
              </b-form-group>

              <b-form-row>
                <b-col cols="12" sm="9" lg="9">
                  <b-form-group label="Tags" label-sr-only :description="`Use up to ${config.MAX_TAG} Tags to categorize the post. Don't use numbers or uppercase letters.`">
                    <b-form-tags
                      v-model="tags"
                      input-id="tags"
                      separator=" ,;"
                      placeholder="Tags"
                      :limit="config.MAX_TAG"
                      :tag-validator="tagValidator"
                      remove-on-delete
                    />
                  </b-form-group>
                </b-col>

                <b-col cols="12" sm="3" lg="3" class="text-end">
                  <b-button @click="showAdvanced = !showAdvanced">
                    Advanced
                  </b-button>
                </b-col>
              </b-form-row>

              <template v-if="showAdvanced">
                <div class="d-flex justify-content-between mt-3">
                  <div class="d-flex flex-column">
                    <label class="d-block">
                      Author
                    </label>
                    <p class="text-muted small">
                      Specify the author of this post (if different from the account used for publishing).
                    </p>
                  </div>

                  <div class="d-flex flex-column">
                    <b-input-group prepend="@">
                      <b-form-input v-model.trim="author" placeholder="Author" />
                    </b-input-group>
                  </div>
                </div>

                <div class="d-flex justify-content-between mt-3">
                  <div class="d-flex flex-column">
                    <label class="d-block">
                      Rewards
                    </label>
                    <p class="text-muted small">
                      How the payout of this post should be distributed.
                    </p>
                  </div>

                  <div class="d-flex">
                    <b-form-select v-model="payoutType" :disabled="isEditing" :options="payoutTypes" />
                  </div>
                </div>

                <div class="d-flex justify-content-between mt-3">
                  <div class="d-flex flex-column">
                    <label class="d-block">
                      Beneficiaries
                    </label>
                    <p class="text-muted small">
                      Add upto 8 beneficiaries of this post.
                    </p>
                  </div>

                  <div class="d-flex flex-column">
                    <b-button variant="primary" :disabled="['burn', 'decline'].includes(payoutType) || isEditing" @click="ui.showModal('addBeneficiaryModal')">
                      {{ beneficiaries.length === 0 ? 'Add Beneficiaries' : `Beneficiaries (${beneficiaries.length})` }}
                    </b-button>
                  </div>
                </div>
              </template>
            </b-card>
          </b-col>

          <b-col class="mt-5 publish-preview-col" lg="6">
            <b-card :title="title !== '' ? title : 'Preview'" class="h-100">
              <template v-if="!isEditing">
                <div v-if="!editPermlink" class="d-flex mb-2">
                  <div>Link preview:</div>

                  <div class="permlink-preview ms-2">
                    {{ linkPreview }}
                  </div>
                  <a href="#" class="d-inline-block ms-2" @click.prevent="editPermlink = true"><fa-icon icon="pencil-alt" style="width:20px" /></a>
                </div>

                <b-form-group
                  v-else
                  label="Permlink"
                  label-sr-only
                  description="Define the permlink (URL) that will be used for this post. Max 255 characters, use only lowercase letter, number and dash."
                >
                  <b-input-group>
                    <b-form-input v-model.trim="permlink" :state="v$.permlink.$dirty ? !v$.permlink.$error : null" />

                    <template #append>
                      <b-button variant="primary" @click.prevent="saveCustomPermlink">
                        <fa-icon icon="check" />
                      </b-button>

                      <b-button variant="primary" @click="editPermlink = false; customPermlink = false">
                        <fa-icon icon="undo" />
                      </b-button>
                    </template>
                  </b-input-group>
                </b-form-group>
              </template>

              <div class="mt-3">
                <markdown-viewer v-if="body.length > 0" :text="body" />

                <div v-else class="fst-italic text-muted">
                  Start writing to see the post preview...
                </div>
              </div>

              <hr>

              <div class="d-flex flex-wrap">
                <nuxt-link v-for="(tag, i) of tags" :key="i" class="badge text-bg-secondary mw-100 b-form-tag text-uppercase me-2 mt-1 px-2" :to="{name:'sort-tag', params:{sort:'trending', tag}}">
                  {{ tag }}
                </nuxt-link>
              </div>
            </b-card>
          </b-col>
        </b-row>

        <div class="action-buttons bg-light">
          <b-container fluid>
            <b-button size="lg" variant="primary" :disabled="!auth.loggedIn" @click.prevent="publishPost">
              {{ isEditing ? 'Update' : 'Publish' }} <fa-icon icon="arrow-right" />
            </b-button>
          </b-container>
        </div>

        <b-modal id="addBeneficiaryModal" v-model="ui.modals.addBeneficiaryModal" centered title="Beneficiaries">
          <div class="d-flex justify-content-between">
            <div class="ms-1 me-1 fw-bold w-50">
              Account
            </div>
            <div class="ms-1 me-1 fw-bold w-25">
              Reward
            </div>
            <div class="ms-1 me-1 fw-bold w-25" />
          </div><hr>

          <div v-for="(b, k) of beneficiaries" :key="k">
            <div class="d-flex justify-content-between">
              <div class="ms-1 me-1 w-50">
                @{{ b.account }}
              </div>

              <div class="ms-1 me-1 w-25">
                {{ (b.weight / 100) }}%
              </div>

              <div class="ms-1 me-1 w-25 text-end">
                <b-button variant="danger" size="sm" @click.prevent="removeBeneficiary(k)">
                  <fa-icon icon="times" />
                </b-button>
              </div>
            </div><hr>
          </div>

          <div class="d-flex justify-content-between mt-3">
            <div class="ms-1 me-1 w-50">
              <b-input-group size="sm" prepend="@">
                <b-form-input v-model.trim="beneficiary.account" size="sm" />
              </b-input-group>
            </div>

            <div class="ms-1 me-1 w-25">
              <b-input-group size="sm" append="%">
                <b-form-input v-model.number="beneficiary.weight" size="sm" type="number" min="1" max="100" />
              </b-input-group>
            </div>

            <div class="ms-1 me-1 w-25 text-end">
              <b-button size="sm" variant="primary" :disabled="beneficiary.length >= 8 || beneficiary.weight <= 0 || beneficiary.account === ''" @click.prevent="addBeneficiary">
                <fa-icon icon="plus" />
              </b-button>
            </div>
          </div>

          <template #modal-footer="{close}">
            <b-button variant="success" @click.prevent="close">
              Save
            </b-button>
          </template>
        </b-modal>
      </template>
    </b-container>
  </div>
</template>

<script>
// Ported from legacy/pages/publish.vue (route name 'publish').
// middleware:'authenticated' -> definePageMeta; asyncData({req}) host -> useRequestURL();
// head() -> useHead; vuelidate (validationMixin/$v) -> useVuelidate (@vuelidate/*), template $v -> v$;
// $config -> config, $auth -> auth (setup); $bvModal.show -> useUiStore().showModal;
// Vuex post/user getters+actions -> Pinia mapState/mapActions; $chain/$notify stay this.$x;
// process.server -> import.meta.server; Buffer imported explicitly (no Vite global polyfill).
import { mapState, mapActions } from 'pinia'
import { Buffer } from 'buffer'
import getSlug from 'speakingurl'
import sanitize from 'sanitize-html'
import { Remarkable } from 'remarkable'
import useVuelidate from '@vuelidate/core'
import { required, minLength, maxLength } from '@vuelidate/validators'
import HtmlReady from '@/utils/HtmlReady'
import { escapeHTML, isHtmlTest, allTags } from '@/utils'
import sanitizeConfig, { allowedTags } from '@/utils/sanitize-config'
import { useAuthStore } from '~/stores/auth'
import { usePostStore } from '~/stores/post'
import { useUserStore } from '~/stores/user'
import { useUiStore } from '~/stores/ui'

const remarkable = new Remarkable({ html: true, breaks: true })

export default {
  name: 'Publish',

  setup () {
    definePageMeta({ name: 'publish', middleware: 'authenticated' })

    useHead({ title: 'Publish' })

    const config = useRuntimeConfig().public
    const auth = useAuthStore()
    const ui = useUiStore()
    const host = useRequestURL().host

    const v$ = useVuelidate()

    return { config, auth, ui, host, v$ }
  },

  data () {
    return {
      loading: false,

      // Local drafts (browser-stored)
      drafts: [],
      draftSaved: false,
      autoSavedAt: null,

      category: '',
      title: '',
      body: '',
      permlink: '',
      tags: [],
      summary: '',
      author: '',
      toolbarOptions: {
        bold: true,
        italic: true,
        header: true,
        strikethrough: true,
        quote: true,
        ol: true,
        ul: true,
        link: true,
        imagelink: true,
        code: true,
        table: true,
        htmlcode: false,
        help: false,
        undo: false,
        redo: false,
        subfield: false,
        preview: false
      },
      payoutType: 'regular',
      payoutTypes: [
        { text: '50% Liquid and 50% Staked', value: 'regular' },
        { text: '100% Staked', value: 'powerup' },
        { text: 'Decline', value: 'decline' },
        { text: 'Burn', value: 'burn' }
      ],
      beneficiary: { account: '', weight: '' },
      beneficiaries: [],

      editPermlink: false,
      customPermlink: false,
      showAdvanced: false,

      multipleImageUploader: null,
      awaitingUpload: false,
      images: [],
      selectedCoverImage: '',

      isEditing: false
    }
  },

  computed: {
    ...mapState(usePostStore, ['post']),

    linkPreview () {
      return `https://${this.host}/@${this.auth.user.username}/${this.permlink ? this.permlink : '...'}`
    },

    hasContent () {
      return !!(this.title.trim() || (this.body && this.body.trim()) || this.summary.trim())
    },

    draftUser () {
      return this.auth.loggedIn ? this.auth.user.username : 'anon'
    },
    draftStoreKey () {
      return `bbh-drafts-${this.draftUser}`
    },
    autoStoreKey () {
      return `bbh-draft-auto-${this.draftUser}`
    }
  },

  watch: {
    async title (v) {
      this.queueAutoSave()

      if (!this.customPermlink && !this.isEditing) {
        let permlink = getSlug(v)
        let post

        try {
          post = await this.$chain.getClient().hivemind.call('get_post_header', { author: this.auth.user.username, permlink })
        } catch {
          //
        }

        if (post) {
          permlink = `${permlink}-${Math.random().toString(36).substring(7)}`
        }

        this.permlink = permlink
      }
    },

    body () { this.queueAutoSave() },
    summary () { this.queueAutoSave() },
    tags: { handler () { this.queueAutoSave() }, deep: true },

    // The session restores asynchronously, so on a fresh load mounted() runs while
    // draftUser is still 'anon' — reading the wrong (empty) draft key. When auth
    // lands and draftUser becomes the real username, re-read the drafts (and, if
    // nothing's been typed yet, restore the auto-saved work). This is why
    // "yesterday's draft" wasn't showing up.
    draftUser () {
      if (this.isEditing) { return }
      this.loadDrafts()
      if (!this.hasContent) { this.restoreAutoDraft() }
    }
  },

  created () {
    if (this.$route.query.edit && this.post) {
      const { title, permlink, body, category, json_metadata: meta } = this.post

      this.isEditing = true

      this.body = body
      this.permlink = permlink
      this.title = title
      this.category = category
      this.tags = meta.tags
      this.author = meta.author
      this.summary = meta.description
    }
  },

  mounted () {
    const self = this

    // Restore any locally-saved drafts / auto-saved work (client-only).
    if (!this.isEditing) {
      this.loadDrafts()
      this.restoreAutoDraft()
    }

    this.multipleImageUploader = setInterval(async () => {
      if (self.images.length > 0 && !this.awaitingUpload) {
        this.awaitingUpload = true

        await self.uploadMultipleImages()

        this.awaitingUpload = false
      }
    }, 1000)

    this.$eventBus.$on(['post-publish-successful', 'post-edit-successful'], async ({ author, permlink, edit, parent_permlink: tag, post_type: postType }) => {
      if (postType === 'post') {
        self.loading = true

        // Published successfully — clear the auto-saved draft.
        self.clearAutoDraft()

        await self.sleep(30 * 1000)

        if (edit) {
          self.$router.push({ name: 'user-post', params: { user: author, post: permlink } })
        } else {
          self.$router.push({ name: 'sort-tag', params: { sort: 'created', tag } })
        }
      }
    })
  },

  beforeUnmount () {
    clearInterval(this.multipleImageUploader)
    clearTimeout(this._draftTimer)

    this.$eventBus.$off(['post-publish-successful', 'post-edit-successful'])
  },

  methods: {
    ...mapActions(useUserStore, ['uploadFile']),
    ...mapActions(usePostStore, ['requestBroadcastPost']),

    sleep (ms) {
      return new Promise(resolve => setTimeout(resolve, ms))
    },

    // ── Local drafts (browser localStorage) ──────────────────────────────────
    draftSnapshot () {
      return { title: this.title, body: this.body, tags: [...this.tags], summary: this.summary, savedAt: Date.now() }
    },

    queueAutoSave () {
      if (this.isEditing || !import.meta.client) { return }
      clearTimeout(this._draftTimer)
      this._draftTimer = setTimeout(() => this.autoSaveDraft(), 800)
    },

    autoSaveDraft () {
      if (this.isEditing || !this.hasContent || !import.meta.client) { return }
      try {
        const snap = this.draftSnapshot()
        localStorage.setItem(this.autoStoreKey, JSON.stringify(snap))
        this.autoSavedAt = snap.savedAt
      } catch { /* storage full / disabled */ }
    },

    saveDraft () {
      if (!this.hasContent) { return }
      const draft = { ...this.draftSnapshot(), id: Date.now() }
      this.drafts = [draft, ...this.drafts].slice(0, 20)
      this.persistDrafts()
      this.draftSaved = true
      setTimeout(() => { this.draftSaved = false }, 2000)
    },

    applyDraft (d) {
      this.title = d.title || ''
      this.body = d.body || ''
      this.tags = [...(d.tags || [])]
      this.summary = d.summary || ''
    },

    deleteDraft (id) {
      this.drafts = this.drafts.filter(d => d.id !== id)
      this.persistDrafts()
    },

    persistDrafts () {
      try { localStorage.setItem(this.draftStoreKey, JSON.stringify(this.drafts)) } catch { /* ignore */ }
    },

    loadDrafts () {
      try { this.drafts = JSON.parse(localStorage.getItem(this.draftStoreKey) || '[]') } catch { this.drafts = [] }
    },

    restoreAutoDraft () {
      try {
        const d = JSON.parse(localStorage.getItem(this.autoStoreKey) || 'null')
        if (d && (d.title || d.body)) {
          this.applyDraft(d)
          this.autoSavedAt = d.savedAt
        }
      } catch { /* ignore */ }
    },

    clearAutoDraft () {
      try { localStorage.removeItem(this.autoStoreKey) } catch { /* ignore */ }
      this.autoSavedAt = null
    },

    draftAgo (ts) {
      const s = Math.max(1, Math.round((Date.now() - ts) / 1000))
      if (s < 60) { return 'just now' }
      if (s < 3600) { return Math.round(s / 60) + 'm ago' }
      if (s < 86400) { return Math.round(s / 3600) + 'h ago' }
      return Math.round(s / 86400) + 'd ago'
    },

    saveCustomPermlink () {
      this.v$.permlink.$touch()

      if (!this.v$.permlink.$invalid) {
        this.editPermlink = false
        this.customPermlink = true
      }
    },

    async addBeneficiary () {
      let { account, weight } = this.beneficiary

      account = account.toLowerCase()
      weight = parseInt(weight) * 100

      const totalWeight = this.beneficiaries.reduce((acc, cur) => acc + cur.weight, weight)

      if (totalWeight > 10000) {
        return this.$notify({
          title: 'Weight exceeded',
          text: 'Sum of all weights should be 100% or less',
          type: 'error'
        })
      } else if (this.beneficiaries.some(b => b.account === account)) {
        return this.$notify({
          title: 'Already exists',
          text: 'Username already exists in the beneficialy list',
          type: 'error'
        })
      }

      try {
        const [accountData] = await this.$chain.getClient().database.getAccounts([account])

        if (accountData) {
          this.beneficiaries.push({ account, weight })

          this.beneficiary = { account: '', weight: '' }

          return
        }
      } catch {
        //
      }

      this.$notify({
        title: 'User not found',
        text: 'User is not a Hive username',
        type: 'error'
      })
    },

    removeBeneficiary (index) {
      this.beneficiaries.splice(index, 1)
    },

    publishPost () {
      this.v$.$touch()

      if (!this.v$.$invalid) {
        const { title, permlink, body, tags, selectedCoverImage, payoutType, beneficiaries } = this

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
            text: `Please remove the following HTML elements from your post: ${Array.from(rtags.htmltags).map(tag => escapeHTML(`<${tag}>`)).join(', ')}`
          })
        }

        const meta = {}

        const metaTags = allTags(tags, '', rtags.hashtags, this.isEditing)

        if (metaTags.size) {
          meta.tags = Array.from(metaTags)
        } else {
          delete meta.tags
        }

        if (rtags.usertags.size) {
          meta.users = Array.from(rtags.usertags)
        } else {
          delete meta.users
        }

        if (rtags.images.size) {
          const moveToFirst = (array, first) => {
            array.sort((x, y) => {
              return x === first ? -1 : y === first ? 1 : 0
            })
          }

          meta.image = Array.from(rtags.images)

          if (selectedCoverImage) {
            moveToFirst(meta.image, selectedCoverImage)
          }
        } else {
          delete meta.image
        }

        if (rtags.links.size) {
          meta.links = Array.from(rtags.links).slice(0, 1)
        } else {
          delete meta.links
        }

        if (this.author !== '') {
          meta.author = this.author
        }

        if (this.summary !== '') {
          meta.description = this.summary
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

        this.requestBroadcastPost({
          title,
          permlink,
          body,
          metadata: meta,
          payout_type: payoutType,
          beneficiaries,
          post_type: 'post',
          edit: this.isEditing
        })
      }
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
    },

    tagValidator (tag) {
      return (
        tag === tag.toLowerCase() &&
        tag.length > 1 &&
        tag.length < 24 &&
        /^[a-z][a-z-0-9]+[a-z0-9]$/.test(tag)
      )
    }
  },

  validations () {
    const self = this

    return {
      title: {
        required,
        noMarkdown: (value) => {
          if (value === '') { return true }

          return !/(?:\*[\w\s]*\*|#[\w\s]*#|_[\w\s]*_|~[\w\s]*~|\]\s*\(|\]\s*\[)/.test(value)
        }
      },

      body: {
        required,
        validateSize: (v) => {
          const size = import.meta.server ? Buffer.byteLength(v, 'utf8') : new Blob([v]).size

          return size < 64 * 1024 - 256 // 64 kb
        }
      },

      permlink: {
        required,
        maxLength: maxLength(255),
        valid: (v) => {
          if (v === '') { return true }

          return /^([a-z0-9-]+)$/.test(v)
        }
      },

      author: {
        minLength: minLength(3),
        maxLength: maxLength(16),
        validUsername: (value) => {
          if (value === '') { return true }
          return /^([a-z])[a-z0-9-.]*$/.test(value)
        }
      },

      tags: {
        required,
        firstTag: (value) => {
          if (!self.isEditing) {
            return true
          }

          return value[0] === self.category
        }
      }
    }
  }
}
</script>

<style scoped>
.create-post { padding: 1.5rem clamp(1rem, 3vw, 2rem) 6rem; }
.create-post :deep(.post-title-input) {
  font-size: 1.6rem;
  font-weight: 700;
  border: 0 !important;
  background: transparent !important;
  padding-left: 0;
}
.create-post :deep(.post-title-input::placeholder) { color: var(--w3-muted); }
.create-post :deep(.card) { margin-bottom: 1.2rem; }
.drafts-bar { display: flex; align-items: center; gap: .6rem; margin-bottom: 1rem; flex-wrap: wrap; }
.drafts-bar .draft-auto { color: var(--w3-muted); font-size: .8rem; margin-left: auto; }
.draft-item { display: flex; align-items: center; gap: .6rem; min-width: 240px; }
.draft-title { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 200px; }
.draft-time { color: var(--w3-muted); font-size: .78rem; }
.draft-del { color: var(--w3-red) !important; text-decoration: none; }
/* fixed publish action bar */
.create-post :deep(.action-buttons) {
  background: rgba(8,8,12,.9) !important;
  backdrop-filter: blur(14px);
  border-top: 1px solid var(--w3-border);
}
</style>
