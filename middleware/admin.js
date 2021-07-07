export default function ({ redirect, store }) {
  if (!store.state.auth.loggedIn || !(store.getters['nftmarketplace/isLoggedIn'] && store.getters['nftmarketplace/isAdmin'])) {
    return redirect('/')
  }
}
