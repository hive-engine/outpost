export default function ({ redirect, store }) {
  if (!store.state.auth.loggedIn || store.state.auth.user.username !== store.getters.issuer) {
    return redirect('/')
  }

  return true
}
