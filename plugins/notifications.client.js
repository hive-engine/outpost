// Notifications — @kyvg/vue3-notification replaces vue-notification (Vue 2 only).
// Same API surface: this.$notify({ title, type, text }) and <notifications />.
// Also bridges the event-bus 'notify' events emitted by the Pinia stores (P1).
import Notifications, { notify } from '@kyvg/vue3-notification'

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.use(Notifications)

  const { $eventBus } = nuxtApp

  if ($eventBus) {
    $eventBus.$on('notify', payload => notify(payload))
  }

  return {
    provide: {
      notify
    }
  }
})
