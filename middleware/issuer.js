// Ported from legacy/middleware/issuer.js
// Vuex: store.state.auth.* -> useAuthStore(); root getter `issuer` -> useTribeStore().issuer
import { useAuthStore } from '~/stores/auth'
import { useTribeStore } from '~/stores/tribe'

export default defineNuxtRouteMiddleware(() => {
  const auth = useAuthStore()
  const tribe = useTribeStore()

  if (!auth.loggedIn || auth.user.username !== tribe.issuer) {
    return navigateTo('/')
  }
})
