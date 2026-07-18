// Bridges event-bus 'show-modal' emissions (used by the Pinia stores since P1)
// to the UI store's modal registry.
import { useUiStore } from '~/stores/ui'

export default defineNuxtPlugin((nuxtApp) => {
  const { $eventBus } = nuxtApp

  // Legacy stores emit lowercase 'smartlock'; the SmartLock modal's real id is
  // 'smartLock' (capital L). Alias so tribe.js's auto-unlock path opens it.
  const aliases = { smartlock: 'smartLock' }

  if ($eventBus) {
    $eventBus.$on('show-modal', id => useUiStore().showModal(aliases[id] || id))
    $eventBus.$on('hide-modal', id => useUiStore().hideModal(aliases[id] || id))
  }
})
