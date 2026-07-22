<template>
  <div v-if="images.length" class="chat-images" :class="`n-${Math.min(images.length, 4)}`">
    <button
      v-for="(src, i) of images.slice(0, 4)"
      :key="i"
      class="chat-image"
      :style="{ backgroundImage: `url('${src}')` }"
      @click.prevent="open(i)"
    >
      <span v-if="i === 3 && images.length > 4" class="chat-image-more">+{{ images.length - 4 }}</span>
    </button>

    <client-only>
      <teleport to="body">
        <div v-if="lightbox" class="chat-lightbox" @click.self="close">
          <button class="lb-close" @click.prevent="close"><fa-icon icon="times" /></button>
          <button v-if="images.length > 1" class="lb-nav lb-prev" @click.prevent="step(-1)"><fa-icon icon="angle-left" /></button>
          <img :src="images[activeIndex]" alt="" @click.stop>
          <button v-if="images.length > 1" class="lb-nav lb-next" @click.prevent="step(1)"><fa-icon icon="angle-right" /></button>
          <div v-if="images.length > 1" class="lb-count">{{ activeIndex + 1 }} / {{ images.length }}</div>
        </div>
      </teleport>
    </client-only>
  </div>
</template>

<script>
// Twitter-style 1–4 image grid with a full-screen lightbox (teleported to body,
// client-only). >4 images show a "+N" overlay on the 4th tile.
export default {
  name: 'ChatImages',

  props: {
    images: { type: Array, default: () => [] }
  },

  data () {
    return {
      lightbox: false,
      activeIndex: 0
    }
  },

  methods: {
    open (i) {
      this.activeIndex = i
      this.lightbox = true
      if (import.meta.client) { document.body.style.overflow = 'hidden' }
    },

    close () {
      this.lightbox = false
      if (import.meta.client) { document.body.style.overflow = '' }
    },

    step (dir) {
      const n = this.images.length
      this.activeIndex = (this.activeIndex + dir + n) % n
    }
  },

  beforeUnmount () {
    if (import.meta.client) { document.body.style.overflow = '' }
  }
}
</script>

<style scoped>
.chat-images {
  display: grid;
  gap: 3px;
  margin-top: .7rem;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid var(--w3-border);
}
.chat-images.n-1 { grid-template-columns: 1fr; }
.chat-images.n-2 { grid-template-columns: 1fr 1fr; }
.chat-images.n-3 { grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; }
.chat-images.n-3 .chat-image:first-child { grid-row: span 2; }
.chat-images.n-4 { grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; }

.chat-image {
  border: none;
  padding: 0;
  cursor: zoom-in;
  background-size: cover;
  background-position: center;
  background-color: var(--w3-panel);
  min-height: 160px;
  position: relative;
  transition: filter .15s ease;
}
.chat-images.n-1 .chat-image { min-height: 220px; max-height: 420px; aspect-ratio: 16 / 9; }
.chat-image:hover { filter: brightness(1.06); }
.chat-image-more {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(8, 8, 12, .6);
  color: #fff;
  font-size: 1.5rem;
  font-weight: 700;
}

/* lightbox */
.chat-lightbox {
  position: fixed;
  inset: 0;
  z-index: 2000;
  background: rgba(4, 4, 8, .92);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3rem;
}
.chat-lightbox img {
  max-width: 92vw;
  max-height: 88vh;
  border-radius: 12px;
  box-shadow: 0 20px 80px rgba(0, 0, 0, .6);
}
.lb-close, .lb-nav {
  position: absolute;
  border: none;
  background: rgba(255, 255, 255, .08);
  color: #fff;
  width: 46px; height: 46px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 1.3rem;
  display: flex; align-items: center; justify-content: center;
  transition: background .15s ease;
}
.lb-close:hover, .lb-nav:hover { background: var(--w3-gold); color: #1a1206; }
.lb-close { top: 1.4rem; right: 1.4rem; }
.lb-prev { left: 1.4rem; }
.lb-next { right: 1.4rem; }
.lb-count {
  position: absolute;
  bottom: 1.4rem;
  color: var(--w3-muted);
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}
</style>
