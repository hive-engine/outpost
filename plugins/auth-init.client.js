// Restore the user session on app startup — replaces @nuxtjs/auth-next's
// automatic user fetch. Client-only: the session cookie is httpOnly, so the
// browser sends it and /api/v1/me answers from the sealed session.
import { useAuthStore } from '~/stores/auth'

export default defineNuxtPlugin(() => {
  const auth = useAuthStore()

  // Fire and forget; pages react via the store's reactive state.
  auth.fetchUser().catch(() => {})
})
