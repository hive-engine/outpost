// Bridges event-bus 'show-modal' emissions (used by the Pinia stores since P1)
// to the UI store's modal registry.
import { useUiStore } from '~/stores/ui'

export default defineNuxtPlugin((nuxtApp) => {
  const { $eventBus } = nuxtApp

  if ($eventBus) {
    $eventBus.$on('show-modal', id => useUiStore().showModal(id))
    $eventBus.$on('hide-modal', id => useUiStore().hideModal(id))
  }
})
