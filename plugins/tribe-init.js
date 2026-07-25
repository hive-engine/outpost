// Global tribe config/info bootstrap — replaces the Nuxt 2 nuxtServerInit that
// called store/index.js fetchTokenInfoAndConfig on every request. Runs on both
// server and client so tribe_config (author_curve_exponent, precision, reward
// pool, etc.) is populated before any page/component reads it.
import { useTribeStore } from '~/stores/tribe'
import { useHiveStatus } from '~/composables/useHiveStatus'

export default defineNuxtPlugin({
  name: 'tribe-init',
  // After services-bridge so the tribe store gets `this.$nuxt` (its init() uses $scot).
  dependsOn: ['services-bridge'],
  async setup () {
    const tribe = useTribeStore()

    if (!tribe.tribe_config) {
      await tribe.init()
    }

    // If the tribe config still couldn't load, the Hive/SCOT network is
    // unreachable — surface it clearly (banner) instead of an empty page.
    if (!tribe.tribe_config) {
      useHiveStatus().value = true
    }
  }
})
