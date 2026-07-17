// App API client — replaces the Nuxt 2 @nuxtjs/axios global $axios.
// Same behavior: baseURL = APP_DOMAIN, credentials on, cache interceptor,
// X-CSRF-Token header, SSR-safe error sanitization.
// NOTE(P2): the CSRF token cookie ('csrf-token') is issued by the Nitro server
// layer ported in P2; until then the header is simply omitted.
import axios from 'axios'
import { setupCache } from 'axios-cache-interceptor'
import { cleanError } from '~/utils/clean-error'

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig().public

  const instance = setupCache(axios.create({
    baseURL: config.APP_DOMAIN,
    withCredentials: true
  }), config.AXIOS_CACHE_CONFIG || {})

  instance.interceptors.request.use((req) => {
    const token = useCookie('csrf-token').value

    if (token && !req.headers['X-CSRF-Token']) {
      req.headers['X-CSRF-Token'] = token
    }

    return req
  })

  instance.interceptors.response.use(
    response => response,
    error => Promise.reject(cleanError(error))
  )

  // @nuxtjs/axios-style sugar used across the legacy codebase
  instance.$get = (url, cfg) => instance.get(url, cfg).then(r => r.data)
  instance.$post = (url, data, cfg) => instance.post(url, data, cfg).then(r => r.data)

  return {
    provide: {
      api: instance
    }
  }
})
