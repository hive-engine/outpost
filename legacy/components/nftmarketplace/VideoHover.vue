<template>
  <video
    :controls="controls"
    :muted="muted"
    preload="auto"
    loop
    @mouseover="videoElementMouseHover($event)"
    @mouseout="videoElementMouseOut($event)"
    @touchstart="videoElementTouchStart($event)"
    @touchend="videoElementTouchEnd($event)"
  >
    <source :src="`${source}#t=0.1`">
  </video>
</template>

<script>
export default {
  name: 'VideoHover',

  props: {
    source: {
      type: String,
      default: ''
    },

    type: {
      type: String,
      default: 'video/mp4'
    },

    muted: {
      type: Boolean,
      default: true
    },

    controls: {
      type: Boolean,
      default: false
    }
  },

  methods: {
    async videoElementMouseHover (event) {
      try {
        await event.target.play()
      } catch {
        //
      }
    },

    videoElementMouseOut (event) {
      if (!event.target.paused) {
        event.target.pause()
      }
    },

    async videoElementTouchStart (event) {
      try {
        await event.target.play()
      } catch {
        //
      }
    },

    videoElementTouchEnd (event) {
      if (!event.target.paused) {
        event.target.pause()
      }
    }
  }
}
</script>
