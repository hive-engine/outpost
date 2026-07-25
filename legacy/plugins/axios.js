import { setupCache } from 'axios-cache-interceptor'
import { cleanError } from '@/utils/clean-error'

export default function ({ $axios, app }) {
  $axios = setupCache($axios)

  $axios.onRequest((config) => {
    const token = app.$csrfToken()

    if (!config.headers['X-CSRF-Token'] && token) { config.headers['X-CSRF-Token'] = token }

    return config
  })

  // Reject with a plain, serializable error (prevents @nuxt/devalue SSR crashes).
  $axios.onError(error => Promise.reject(cleanError(error)))
}
