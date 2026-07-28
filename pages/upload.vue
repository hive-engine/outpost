<template>
  <div class="upload-page">
    <div class="upload-card">
      <h1 class="upload-title"><fa-icon icon="film" /> Upload to 3Speak</h1>
      <p class="upload-sub">Publish a video or short to Hive via 3Speak — right from The BBH Project.</p>

      <div v-if="!auth.loggedIn" class="upload-login">
        <fa-icon icon="video" class="drop-icon" />
        <p>Log in with Hive Keychain to upload a video.</p>
        <b-button variant="primary" @click="ui.showModal('loginModal')">Log in</b-button>
      </div>

      <!-- file picker -->
      <div v-if="auth.loggedIn && !file" class="drop-zone" @click="$refs.file.click()" @dragover.prevent @drop.prevent="onDrop">
        <fa-icon icon="video" class="drop-icon" />
        <p>Click or drop a video here</p>
        <span class="drop-hint">MP4, MOV, WebM… up to 5&nbsp;GB</span>
        <input ref="file" type="file" accept="video/*" hidden @change="onPick">
      </div>

      <template v-else-if="auth.loggedIn && file">
        <video ref="preview" class="preview" :src="previewUrl" controls @loadedmetadata="onMeta" />
        <div class="file-row">
          <span class="file-name">{{ file.name }}</span>
          <span class="file-meta mono">{{ prettySize }} · {{ duration ? duration + 's' : '…' }}</span>
          <button class="file-x" :disabled="busy" @click="reset"><fa-icon icon="times" /></button>
        </div>

        <label class="short-toggle">
          <input v-model="isShort" type="checkbox" :disabled="busy">
          <span>Short <small>(portrait, ≤ {{ maxShort }}s — appears in the Shorts feed)</small></span>
        </label>

        <b-form-input v-if="!isShort" v-model="title" class="mt-2" placeholder="Title" :disabled="busy" />
        <textarea v-model="caption" class="caption mt-2" rows="3" :placeholder="isShort ? 'Caption…' : 'Description…'" :disabled="busy" />
        <b-form-input v-model="tagsText" class="mt-2" placeholder="Tags (space separated)" :disabled="busy" />

        <!-- progress / status -->
        <div v-if="stage !== 'idle'" class="status" :class="stage">
          <div v-if="stage === 'uploading'" class="bar"><span :style="{ width: pct + '%' }" /></div>
          <p class="status-text">
            <fa-icon v-if="busy" icon="circle-notch" class="fa-spin" />
            {{ statusText }}
          </p>
          <p v-if="embedUrl && stage === 'done'" class="status-embed">
            <a :href="postUrl" target="_blank" rel="noopener">View your post →</a>
          </p>
        </div>

        <div class="actions">
          <b-button variant="primary" size="lg" :disabled="!canPublish" @click="publish">
            <fa-icon v-if="busy" icon="circle-notch" class="fa-spin" />
            {{ isShort ? 'Publish Short' : 'Publish Video' }}
          </b-button>
        </div>

        <p class="benefic-note">
          3Speak's mandatory splits apply to every upload: 10% to <strong>threespeakfund</strong> + 1% to <strong>encoder.pay</strong> (funds transcoding &amp; bandwidth).
        </p>
      </template>
    </div>
  </div>
</template>

<script>
// 3Speak upload (V3). Flow: mint a server-side token → upload bytes to 3Speak
// (simple multipart with progress) → publish the Hive post via Keychain with the
// 3Speak json_metadata + MANDATORY beneficiaries → bridge asset↔post server-side.
import { mapActions } from 'pinia'
import { useAuthStore } from '~/stores/auth'
import { useTribeStore } from '~/stores/tribe'
import { useUiStore } from '~/stores/ui'

const slugify = (s) => (s || '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 40)

export default {
  name: 'UploadPage',

  setup () {
    const config = useRuntimeConfig().public
    const auth = useAuthStore()
    const ui = useUiStore()
    useHead({ title: 'Upload to 3Speak' })
    return { config, auth, ui }
  },

  data () {
    return {
      file: null,
      previewUrl: '',
      duration: 0,
      isShort: true,
      title: '',
      caption: '',
      tagsText: '',
      stage: 'idle', // idle | uploading | publishing | bridging | done | error
      pct: 0,
      embedUrl: '',
      assetPermlink: '',
      hivePermlink: '',
      maxShort: 120
    }
  },

  computed: {
    busy () { return ['uploading', 'publishing', 'bridging'].includes(this.stage) },
    prettySize () {
      const mb = (this.file?.size || 0) / (1024 * 1024)
      return mb >= 1000 ? `${(mb / 1024).toFixed(2)} GB` : `${mb.toFixed(1)} MB`
    },
    canPublish () {
      return this.auth.loggedIn && this.file && !this.busy && this.stage !== 'done' &&
        (this.caption.trim() || (!this.isShort && this.title.trim()))
    },
    postUrl () {
      return this.hivePermlink ? `/@${this.auth.user.username}/${this.hivePermlink}` : '#'
    },
    statusText () {
      return {
        uploading: `Uploading to 3Speak… ${this.pct}%`,
        publishing: 'Publishing to Hive (approve in Keychain)…',
        bridging: 'Linking video to your post…',
        done: '✅ Published! It will finish encoding on 3Speak shortly.',
        error: this._error || 'Something went wrong.'
      }[this.stage] || ''
    }
  },

  // No auth redirect (that caused a login loop when the session hadn't restored
  // yet). Logged-out users see a login prompt instead; Publish stays disabled.

  beforeUnmount () {
    clearTimeout(this._pubTimeout)
    if (this.previewUrl) { URL.revokeObjectURL(this.previewUrl) }
    this.$eventBus.$off('comment-publish-successful', this.onPublished)
    this.$eventBus.$off('transaction-broadcast-error', this.onBroadcastError)
  },

  methods: {
    ...mapActions(useTribeStore, ['requestBroadcastOps']),

    onPick (e) { this.setFile(e.target.files?.[0]) },
    onDrop (e) { this.setFile(e.dataTransfer?.files?.[0]) },

    setFile (f) {
      if (!f || !f.type.startsWith('video/')) { return }
      this.file = f
      this.previewUrl = URL.createObjectURL(f)
    },

    onMeta () {
      const v = this.$refs.preview
      if (v) { this.duration = Math.round(v.duration) || 0 }
    },

    reset () {
      if (this.previewUrl) { URL.revokeObjectURL(this.previewUrl) }
      this.file = null
      this.previewUrl = ''
      this.duration = 0
      this.stage = 'idle'
      this.pct = 0
      this.embedUrl = ''
      this.assetPermlink = ''
      this.hivePermlink = ''
    },

    fail (msg) {
      clearTimeout(this._pubTimeout)
      this._error = msg
      this.stage = 'error'
      this.$notify({ title: 'Upload failed', type: 'error', text: msg })
    },

    async publish () {
      if (!this.canPublish) { return }

      if (this.isShort && this.duration && this.duration > this.maxShort) {
        return this.fail(`Shorts must be ${this.maxShort}s or shorter (this is ${this.duration}s).`)
      }

      try {
        // 1. Mint a server-side upload token (owner = logged-in user).
        this.stage = 'uploading'; this.pct = 0
        const tok = await $fetch('/api/v1/3speak/token', {
          method: 'POST',
          body: { short: this.isShort, max_file_size: this.file.size }
        })
        this.assetPermlink = tok.permlink
        this.embedUrl = tok.embed_url

        // 2. Upload the bytes (simple multipart with progress).
        await this.uploadBytes(tok.token)

        // 3. Publish the Hive post (Keychain), then bridge on success.
        this.stage = 'publishing'
        this.broadcastPost()
      } catch (e) {
        this.fail(e?.data?.statusMessage || e?.message || 'Upload failed.')
      }
    },

    uploadBytes (token) {
      return new Promise((resolve, reject) => {
        const host = this.config.THREESPEAK_EMBED_HOST || 'https://embed2.3speak.tv'
        const form = new FormData()
        form.append('token', token)
        form.append('filename', this.file.name)
        if (this.duration) { form.append('duration', String(this.duration)) }
        form.append('file', this.file)

        const xhr = new XMLHttpRequest()
        xhr.open('POST', `${host}/upload/simple`)
        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable) { this.pct = Math.round(ev.loaded / ev.total * 100) }
        }
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const res = JSON.parse(xhr.responseText)
              if (res.permlink) { this.assetPermlink = res.permlink }
              if (res.embed_url) { this.embedUrl = res.embed_url }
            } catch { /* keep token values */ }
            resolve()
          } else {
            reject(new Error(`3Speak upload failed (${xhr.status})`))
          }
        }
        xhr.onerror = () => reject(new Error('Network error during upload'))
        xhr.send(form)
      })
    },

    broadcastPost () {
      const owner = this.auth.user.username
      this.hivePermlink = `${this.isShort ? 'bbh-short' : 'bbh-video'}-${slugify(this.caption || this.title) || 'post'}-${Date.now().toString(36)}`

      const community = this.config.THREESPEAK_COMMUNITY || 'hive-181335'
      const userTags = this.tagsText.trim() ? this.tagsText.trim().toLowerCase().split(/\s+/).slice(0, 6) : []
      const tags = [...new Set([community, this.config.SCOT_TAG, ...userTags].filter(Boolean))].slice(0, 10)

      const watchBase = this.isShort ? 'https://3speak.tv/shorts' : 'https://3speak.tv/watch'
      const body = [
        this.embedUrl,
        '',
        this.caption.trim(),
        '',
        '---',
        `▶ [Watch on 3speak.tv](${watchBase}?v=${owner}/${this.hivePermlink})`
      ].join('\n')

      const metadata = {
        app: '3speak/embed',
        format: 'markdown',
        tags,
        links: [this.embedUrl],
        video: {
          platform: '3speak',
          url: this.embedUrl,
          reusable: false,
          info: {
            platform: '3speak',
            author: owner,
            permlink: this.assetPermlink,
            title: this.isShort ? '' : this.title,
            duration: this.duration || 0
          }
        }
      }

      // Mandatory 3Speak beneficiaries (sorted by account ascending).
      const beneficiaries = (this.config.THREESPEAK_BENEFICIARIES || [])
        .slice().sort((a, b) => a.account.localeCompare(b.account))

      const comment = {
        parent_author: '',
        parent_permlink: community,
        author: owner,
        permlink: this.hivePermlink,
        title: this.isShort ? '' : this.title,
        body,
        json_metadata: JSON.stringify(metadata)
      }

      const commentOptions = {
        author: owner,
        permlink: this.hivePermlink,
        max_accepted_payout: '1000000.000 HBD',
        percent_hbd: 10000,
        allow_votes: true,
        allow_curation_rewards: true,
        extensions: [[0, { beneficiaries }]]
      }

      // Guard: a Keychain user with no Keychain available (e.g. the Keychain
      // in-app browser, which can't inject it) would otherwise wait forever for a
      // popup that never appears. Fail fast with guidance instead.
      if (!this.auth.user.smartlock && this.auth.user.method !== 'hiveauth' && !window.hive_keychain) {
        return this.fail("Hive Keychain wasn't detected. If you're in an in-app browser, open thebbhproject.com in Safari or Chrome (or log in with HiveAuth) to publish.")
      }

      this.$eventBus.$on('comment-publish-successful', this.onPublished)
      this.$eventBus.$on('transaction-broadcast-error', this.onBroadcastError)

      // Safety net: if the signer never responds — no approval AND no cancel,
      // common when a popup is blocked or swallowed by a webview — don't spin
      // forever. Time out with a helpful message.
      clearTimeout(this._pubTimeout)
      this._pubTimeout = setTimeout(() => {
        if (this.stage === 'publishing') {
          this.$eventBus.$off('comment-publish-successful', this.onPublished)
          this.$eventBus.$off('transaction-broadcast-error', this.onBroadcastError)
          this.fail("Timed out waiting for approval. If your signer didn't pop up, try again — or use a normal browser (Safari/Chrome) with Keychain or HiveAuth.")
        }
      }, 120000)

      this.requestBroadcastOps({
        operations: [['comment', comment], ['comment_options', commentOptions]],
        emitEvent: 'comment-publish-successful',
        emitData: { author: owner, permlink: this.hivePermlink }
      })
    },

    async onPublished (data) {
      if (data.permlink !== this.hivePermlink) { return }
      clearTimeout(this._pubTimeout)
      this.$eventBus.$off('comment-publish-successful', this.onPublished)

      // 4. Bridge asset ↔ Hive post (mandatory — makes it appear in 3Speak feeds).
      this.stage = 'bridging'
      try {
        await $fetch('/api/v1/3speak/bridge', {
          method: 'POST',
          body: {
            permlink: this.assetPermlink,
            hive_author: this.auth.user.username,
            hive_permlink: this.hivePermlink,
            hive_title: this.isShort ? '' : this.title,
            hive_body: [this.embedUrl, '', this.caption.trim()].join('\n'),
            hive_tags: [this.config.THREESPEAK_COMMUNITY]
          }
        })
      } catch {
        // The post is published; bridging can be retried. Warn but don't hard-fail.
        this.$notify({ title: 'Heads up', type: 'warn', text: 'Post published, but linking to 3Speak failed — it may take a moment to appear in feeds.' })
      }
      this.stage = 'done'
    },

    onBroadcastError () {
      clearTimeout(this._pubTimeout)
      this.$eventBus.$off('transaction-broadcast-error', this.onBroadcastError)
      if (this.stage === 'publishing') { this.fail('Publishing was cancelled or failed.') }
    }
  }
}
</script>

<style scoped>
.upload-page { max-width: 640px; margin: 0 auto; padding: 1.5rem clamp(.8rem, 3vw, 1.4rem) 4rem; }
.upload-card { background: var(--w3-panel); border: 1px solid var(--w3-border); border-radius: 18px; padding: clamp(1.1rem, 4vw, 2rem); }
.upload-title {
  font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 1.6rem; margin: 0;
  background: linear-gradient(135deg, var(--w3-gold), #ffd34d); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
}
.upload-sub { color: var(--w3-muted); margin: .3rem 0 1.3rem; }

.upload-login { text-align: center; color: var(--w3-muted); padding: 2.5rem 1rem; }
.upload-login p { margin: .8rem 0 1.2rem; }

.drop-zone {
  border: 2px dashed var(--w3-border); border-radius: 16px; padding: 3rem 1rem; text-align: center;
  color: var(--w3-muted); cursor: pointer; transition: border-color .15s ease, background .15s ease;
}
.drop-zone:hover { border-color: var(--w3-gold); background: rgba(245, 184, 0, .04); }
.drop-icon { font-size: 2.4rem; color: var(--w3-gold); margin-bottom: .6rem; }
.drop-hint { font-size: .8rem; }

.preview { width: 100%; max-height: 380px; border-radius: 12px; background: #000; margin-bottom: .6rem; }
.file-row { display: flex; align-items: center; gap: .6rem; font-size: .85rem; }
.file-name { color: var(--w3-text); font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.file-meta { color: var(--w3-muted); margin-left: auto; }
.file-x { border: none; background: transparent; color: var(--w3-muted); cursor: pointer; }
.file-x:hover { color: var(--w3-red); }

.short-toggle { display: flex; align-items: center; gap: .5rem; margin-top: 1rem; color: var(--w3-text); cursor: pointer; }
.short-toggle small { color: var(--w3-muted); }
.caption { width: 100%; background: var(--w3-bg-2); border: 1px solid var(--w3-border); border-radius: 10px; color: var(--w3-text); padding: .6rem .8rem; resize: vertical; }
.caption:focus { outline: none; border-color: var(--w3-gold); }

.status { margin-top: 1.2rem; }
.bar { height: 8px; border-radius: 6px; background: var(--w3-border); overflow: hidden; }
.bar span { display: block; height: 100%; background: linear-gradient(90deg, var(--w3-gold), #ffd34d); transition: width .2s ease; }
.status-text { color: var(--w3-text); margin: .5rem 0 0; font-size: .9rem; }
.status.error .status-text { color: var(--w3-red); }
.status.done .status-text { color: #2ecc71; }
.status-embed a { color: var(--w3-gold); font-weight: 700; }

.actions { margin-top: 1.3rem; }
.actions :deep(.btn) {
  border: none; border-radius: 999px; font-weight: 700; padding: .6rem 1.8rem;
  background: linear-gradient(135deg, var(--w3-gold), #ffd34d); color: #1a1206;
}
.benefic-note { color: var(--w3-muted); font-size: .78rem; margin-top: 1rem; line-height: 1.5; }
.benefic-note strong { color: var(--w3-text); }
</style>
