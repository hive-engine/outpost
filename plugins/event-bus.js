// Event bus — replaces the Nuxt 2 `new Vue()` bus ($on/$off removed in Vue 3).
// Backed by mitt, with a Vue-2-style adapter ($on/$off/$emit/$once, array-of-events
// support) so the ~150 legacy call sites port without rewrites.
import mitt from 'mitt'

export default defineNuxtPlugin(() => {
  const emitter = mitt()

  const normalize = events => (Array.isArray(events) ? events : [events])

  const bus = {
    // mitt-native API
    on: emitter.on,
    off: emitter.off,
    emit: emitter.emit,

    // Vue 2 bus compatibility layer
    $on (events, handler) {
      normalize(events).forEach(e => emitter.on(e, handler))
    },

    $off (events, handler) {
      normalize(events).forEach(e => emitter.off(e, handler))
    },

    $once (events, handler) {
      normalize(events).forEach((e) => {
        const once = (payload) => {
          emitter.off(e, once)
          handler(payload)
        }
        emitter.on(e, once)
      })
    },

    // Vue 2 $emit passed multiple args; mitt takes one payload. Legacy call sites
    // here only ever pass 0-1 payload args, so forward the first.
    $emit (event, payload) {
      emitter.emit(event, payload)
    }
  }

  return {
    provide: {
      eventBus: bus
    }
  }
})
