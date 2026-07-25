// Ported from legacy/middleware/authenticated.js
// Vuex store.state.auth.loggedIn -> useAuthStore().loggedIn; redirect('/') -> navigateTo('/')
import { useAuthStore } from '~/stores/auth'

export default defineNuxtRouteMiddleware(() => {
  const auth = useAuthStore()

  if (!auth.loggedIn) {
    return navigateTo('/')
  }
})
