// Ported from legacy/middleware/admin.js
// Vuex: store.state.auth.loggedIn -> useAuthStore().loggedIn;
// store.getters['nftmarketplace/isLoggedIn'|'isAdmin'] -> useNftMarketplaceStore().isLoggedIn/isAdmin
import { useAuthStore } from '~/stores/auth'
import { useNftMarketplaceStore } from '~/stores/nftmarketplace'

export default defineNuxtRouteMiddleware(() => {
  const auth = useAuthStore()
  const nftm = useNftMarketplaceStore()

  if (!auth.loggedIn || !(nftm.isLoggedIn && nftm.isAdmin)) {
    return navigateTo('/')
  }
})
