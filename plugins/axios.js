import { setupCache } from 'axios-cache-interceptor'

export default function ({ $axios, app }) {
  $axios = setupCache($axios)

  $axios.onRequest((config) => {
    const token = app.$csrfToken()

    if (!config.headers['X-CSRF-Token'] && token) { config.headers['X-CSRF-Token'] = token }

    return config
  })
}
