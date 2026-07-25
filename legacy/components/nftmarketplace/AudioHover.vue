<template>
  <div v-lazy:background-image="poster">
    <audio
      style="display: block; height: 100%; width: 100%"
      :controls="controls"
      :muted="muted"
      preload="auto"
      loop
      @mouseover="audioElementMouseHover($event)"
      @mouseout="audioElementMouseOut($event)"
      @touchstart="audioElementTouchStart($event)"
      @touchend="audioElementTouchEnd($event)"
    >
      <source :src="source">
    </audio>
  </div>
</template>

<script>
export default {
  name: 'AudioHover',

  props: {
    source: {
      type: String,
      default: ''
    },

    poster: {
      type: String,
      default: ''
    },

    type: {
      type: String,
      default: 'audio/mpeg'
    },

    muted: {
      type: Boolean,
      default: false
    },

    controls: {
      type: Boolean,
      default: false
    }
  },

  methods: {
    async audioElementMouseHover (event) {
      try {
        await event.target.play()
      } catch {
        //
      }
    },

    audioElementMouseOut (event) {
      if (!event.target.paused) {
        event.target.pause()
      }
    },

    async audioElementTouchStart (event) {
      try {
        await event.target.play()
      } catch {
        //
      }
    },

    audioElementTouchEnd (event) {
      if (!event.target.paused) {
        event.target.pause()
      }
    }
  }
}
</script>
