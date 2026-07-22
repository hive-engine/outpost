<template>
  <div
    class="chat-composer"
    :class="{ dragging: isDragging }"
    @dragover.prevent="isDragging = true"
    @dragleave.prevent="isDragging = false"
    @drop.prevent="onDrop"
  >
    <div class="composer-avatar">
      <b-avatar :src="`${config.IMAGES_CDN}u/${auth.user.username}/avatar`" variant="dark" size="46px" />
    </div>

    <div class="composer-main">
      <textarea
        ref="input"
        v-model="draft"
        class="composer-input"
        rows="1"
        :maxlength="hardLimit"
        placeholder="What's happening on Hive?"
        @input="autogrow"
        @paste="onPaste"
        @keydown.meta.enter="submit"
        @keydown.ctrl.enter="submit"
      />

      <!-- image previews -->
      <div v-if="images.length" class="composer-images" :class="`n-${images.length}`">
        <div v-for="img of images" :key="img.id" class="composer-thumb">
          <img v-if="img.url" :src="img.url" alt="">
          <div v-else class="composer-thumb-loading"><fa-icon icon="circle-notch" class="fa-spin" /></div>
          <button class="composer-thumb-x" @click.prevent="removeImage(img.id)"><fa-icon icon="times" /></button>
        </div>
      </div>

      <div class="composer-bar">
        <div class="composer-tools">
          <button class="composer-tool" title="Add image" :disabled="images.length >= 4" @click.prevent="pickFile">
            <fa-icon icon="image" />
          </button>
          <input ref="file" type="file" accept="image/*" multiple hidden @change="onFilePick">
          <span v-if="uploading" class="composer-uploading"><fa-icon icon="circle-notch" class="fa-spin" /> uploading…</span>
        </div>

        <div class="composer-right">
          <!-- circular counter -->
          <svg v-if="draft.length" class="counter-ring" viewBox="0 0 32 32" :class="{ near: overSoft, over: nearHard }">
            <circle class="ring-track" cx="16" cy="16" r="13" />
            <circle
              class="ring-fill"
              cx="16" cy="16" r="13"
              :stroke-dasharray="ringCirc"
              :stroke-dashoffset="ringOffset"
            />
            <text v-if="overSoft" x="16" y="16" class="ring-text" dominant-baseline="central" text-anchor="middle">{{ softLimit - draft.length }}</text>
          </svg>

          <b-button
            class="composer-post"
            :disabled="!canPost || posting || uploading"
            @click.prevent="submit"
          >
            <fa-icon v-if="posting" icon="circle-notch" class="fa-spin" />
            <template v-else>Chat</template>
          </b-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
// Rich Chats composer: autogrow text, drag/drop + click + paste image upload
// (reuses the Hive image-upload plumbing from the user store), a Twitter-style
// circular character counter, and Cmd/Ctrl+Enter to send. Emits `submit` with
// { body, images } — the page composes the final markdown + broadcasts.
import { mapActions } from 'pinia'
import { useAuthStore } from '~/stores/auth'
import { useUserStore } from '~/stores/user'

let _uid = 0

export default {
  name: 'ChatComposer',

  props: {
    posting: { type: Boolean, default: false }
  },

  emits: ['submit'],

  setup () {
    const config = useRuntimeConfig().public
    const auth = useAuthStore()
    return { config, auth }
  },

  data () {
    return {
      draft: '',
      images: [], // { id, url|null, uploading }
      isDragging: false,
      softLimit: 480,
      hardLimit: 8000
    }
  },

  computed: {
    uploading () {
      return this.images.some(i => i.uploading)
    },

    canPost () {
      return (this.draft.trim().length > 0 || this.images.some(i => i.url)) && !this.uploading
    },

    overSoft () {
      return this.draft.length > this.softLimit * 0.8
    },

    nearHard () {
      return this.draft.length > this.softLimit
    },

    ringCirc () {
      return 2 * Math.PI * 13
    },

    ringOffset () {
      const pct = Math.min(this.draft.length / this.softLimit, 1)
      return this.ringCirc * (1 - pct)
    }
  },

  methods: {
    ...mapActions(useUserStore, ['uploadFile']),

    autogrow () {
      const el = this.$refs.input
      if (!el) { return }
      el.style.height = 'auto'
      el.style.height = `${Math.min(el.scrollHeight, 340)}px`
    },

    pickFile () {
      this.$refs.file?.click()
    },

    onFilePick (e) {
      this.handleFiles(Array.from(e.target.files || []))
      e.target.value = ''
    },

    onDrop (e) {
      this.isDragging = false
      this.handleFiles(Array.from(e.dataTransfer?.files || []))
    },

    onPaste (e) {
      const files = Array.from(e.clipboardData?.items || [])
        .filter(i => i.type.startsWith('image/'))
        .map(i => i.getAsFile())
        .filter(Boolean)
      if (files.length) { this.handleFiles(files) }
    },

    handleFiles (files) {
      const room = 4 - this.images.length
      files.filter(f => f.type.startsWith('image/')).slice(0, room).forEach(f => this.uploadOne(f))
    },

    async uploadOne (file) {
      if (!this.auth.loggedIn) { return }

      const id = ++_uid
      this.images.push({ id, url: null, uploading: true })

      try {
        // The user-store uploadFile expects a File with a `.miniurl` data URL.
        file.miniurl = await this.readDataUrl(file)
        const url = await this.uploadFile(file)

        const entry = this.images.find(i => i.id === id)
        if (!entry) { return } // removed mid-upload

        if (url) {
          entry.url = url
          entry.uploading = false
        } else {
          this.removeImage(id)
          this.$notify({ title: 'Upload failed', type: 'error', text: 'Could not upload that image.' })
        }
      } catch (e) {
        this.removeImage(id)
        this.$notify({ title: 'Upload failed', type: 'error', text: e.message || 'Could not upload that image.' })
      }
    },

    readDataUrl (file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
    },

    removeImage (id) {
      this.images = this.images.filter(i => i.id !== id)
    },

    submit () {
      if (!this.canPost || this.posting) { return }

      this.$emit('submit', {
        body: this.draft.trim(),
        images: this.images.filter(i => i.url).map(i => i.url)
      })
    },

    reset () {
      this.draft = ''
      this.images = []
      this.$nextTick(this.autogrow)
    }
  }
}
</script>

<style scoped>
.chat-composer {
  display: flex;
  gap: .9rem;
  padding: 1.1rem clamp(.9rem, 3vw, 1.4rem);
  border-bottom: 1px solid var(--w3-border);
  position: relative;
  transition: background .18s ease;
}
.chat-composer.dragging {
  background: rgba(245, 184, 0, .06);
  box-shadow: inset 0 0 0 2px var(--w3-gold);
  border-radius: 14px;
}
.chat-composer.dragging::after {
  content: 'Drop images to add';
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--w3-gold);
  font-weight: 700;
  pointer-events: none;
  background: rgba(8, 8, 12, .55);
  border-radius: 14px;
}

.composer-avatar :deep(.b-avatar) {
  border: 2px solid transparent;
  background:
    linear-gradient(var(--w3-bg), var(--w3-bg)) padding-box,
    linear-gradient(135deg, var(--w3-gold), var(--w3-red)) border-box;
}

.composer-main { flex: 1; min-width: 0; }

.composer-input {
  width: 100%;
  background: transparent;
  border: none;
  outline: none;
  resize: none;
  color: var(--w3-text);
  font-size: 1.25rem;
  line-height: 1.5;
  padding: .4rem 0 .2rem;
  overflow: hidden;
}
.composer-input::placeholder { color: var(--w3-muted); }

/* image previews */
.composer-images {
  display: grid;
  gap: .4rem;
  margin: .6rem 0 .2rem;
  border-radius: 16px;
  overflow: hidden;
}
.composer-images.n-1 { grid-template-columns: 1fr; }
.composer-images.n-2 { grid-template-columns: 1fr 1fr; }
.composer-images.n-3, .composer-images.n-4 { grid-template-columns: 1fr 1fr; }
.composer-thumb {
  position: relative;
  aspect-ratio: 16 / 10;
  background: var(--w3-panel);
  border-radius: 12px;
  overflow: hidden;
}
.composer-images.n-1 .composer-thumb { aspect-ratio: 16 / 9; }
.composer-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
.composer-thumb-loading {
  width: 100%; height: 100%;
  display: flex; align-items: center; justify-content: center;
  color: var(--w3-gold);
}
.composer-thumb-x {
  position: absolute;
  top: .35rem; right: .35rem;
  width: 26px; height: 26px;
  border: none;
  border-radius: 50%;
  background: rgba(8, 8, 12, .8);
  color: #fff;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: background .15s ease;
}
.composer-thumb-x:hover { background: var(--w3-red); }

.composer-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: .5rem;
}
.composer-tools { display: flex; align-items: center; gap: .6rem; }
.composer-tool {
  border: none;
  background: transparent;
  color: var(--w3-gold);
  font-size: 1.15rem;
  cursor: pointer;
  width: 38px; height: 38px;
  border-radius: 50%;
  transition: background .15s ease, transform .15s ease;
}
.composer-tool:hover:not(:disabled) { background: rgba(245, 184, 0, .12); transform: translateY(-1px); }
.composer-tool:disabled { opacity: .4; cursor: default; }
.composer-uploading { color: var(--w3-muted); font-size: .82rem; }

.composer-right { display: flex; align-items: center; gap: .9rem; }

/* circular counter */
.counter-ring { width: 30px; height: 30px; transform: rotate(-90deg); }
.ring-track { fill: none; stroke: var(--w3-border); stroke-width: 3; }
.ring-fill {
  fill: none;
  stroke: var(--w3-gold);
  stroke-width: 3;
  stroke-linecap: round;
  transition: stroke-dashoffset .2s ease, stroke .2s ease;
}
.counter-ring.near .ring-fill { stroke: #ff9f1c; }
.counter-ring.over .ring-fill { stroke: var(--w3-red); }
.ring-text {
  transform: rotate(90deg);
  transform-origin: center;
  font-size: 11px;
  font-weight: 700;
  fill: var(--w3-muted);
}
.counter-ring.over .ring-text { fill: var(--w3-red); }

.composer-post {
  border: none !important;
  border-radius: 999px !important;
  font-weight: 700 !important;
  padding: .5rem 1.5rem !important;
  background: linear-gradient(135deg, var(--w3-gold), #ffd34d) !important;
  color: #1a1206 !important;
  box-shadow: 0 4px 18px rgba(245, 184, 0, .28);
  transition: transform .15s ease, box-shadow .15s ease, opacity .15s ease;
}
.composer-post:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 24px rgba(245, 184, 0, .4); }
.composer-post:disabled { opacity: .45; box-shadow: none; }
</style>
