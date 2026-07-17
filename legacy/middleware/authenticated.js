export default function ({ redirect, store }) {
  if (!store.state.auth.loggedIn) {
    return redirect('/')
  }
}
