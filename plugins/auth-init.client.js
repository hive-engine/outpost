// Restore the user session on app startup — replaces @nuxtjs/auth-next's
// automatic user fetch. Client-only: the session cookie is httpOnly, so the
// browser sends it and /api/v1/me answers from the sealed session.
import { useAuthStore } from '~/stores/auth'

export default defineNuxtPlugin({
  name: 'auth-init',
  // Must run after services-bridge so the auth store instance gets `this.$nuxt`
  // (otherwise fetchUser/login silently fail on `const { $api } = this.$nuxt`).
  dependsOn: ['services-bridge'],
  setup () {
    const auth = useAuthStore()

    // Fire and forget; pages react via the store's reactive state.
    auth.fetchUser().catch(() => {})
  }
})
