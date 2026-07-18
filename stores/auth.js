// Session auth store — replaces @nuxtjs/auth-next (cookie strategy).
// The legacy module only wrapped three endpoints (/api/v1/login, /me, /logout) with
// a session cookie; this store mirrors its public surface (loggedIn, user,
// login({ data }), logout, fetchUser) so legacy `$auth` call sites port 1:1.
// Server endpoints are the same Express ones until P2 ports them to Nitro.
import { defineStore } from 'pinia'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null, // { username, smartlock }
    busy: false
  }),

  getters: {
    loggedIn: state => !!state.user
  },

  actions: {
    // Legacy signature: this.$auth.login({ data: { username, ts, sig, smartlock } })
    async login ({ data }) {
      const { $api } = this.$nuxt

      this.busy = true

      try {
        const result = await $api.$post('/api/v1/login', data)

        if (result && result.username) {
          this.user = { username: result.username, smartlock: result.smartlock }
        }

        return { data: result }
      } finally {
        this.busy = false
      }
    },

    // Restore session from the http-only cookie (called on app init / navigation)
    async fetchUser () {
      const { $api } = this.$nuxt

      try {
        const result = await $api.$post('/api/v1/me')

        this.user = result && result.username
          ? { username: result.username, smartlock: result.smartlock }
          : null
      } catch {
        this.user = null
      }

      return this.user
    },

    async logout () {
      const { $api } = this.$nuxt

      try {
        await $api.$post('/api/v1/logout')
      } finally {
        this.user = null
      }
    }
  }
})
