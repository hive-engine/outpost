// Convenience composable mirroring the old `this.$auth` object shape.
// Pages/components can `const $auth = useAuth()` and keep `$auth.loggedIn`,
// `$auth.user.username`, `$auth.login(...)`, `$auth.logout()` call sites as-is.
import { useAuthStore } from '~/stores/auth'

export function useAuth () {
  const store = useAuthStore()

  return {
    get loggedIn () { return store.loggedIn },
    get user () { return store.user },
    login: opts => store.login(opts),
    logout: () => store.logout(),
    fetchUser: () => store.fetchUser()
  }
}
