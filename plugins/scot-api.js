// SCOT API client — ported from legacy/plugins/scot-api.js.
// @nuxtjs/axios is gone in Nuxt 3; use a plain axios instance with the same
// cache interceptor, token param injection, and SSR-safe error sanitization.
// Legacy exposed $scot.$get(url, cfg) (the @nuxtjs/axios sugar returning data
// directly) — provide the same sugar so store/page call sites port unchanged.
import axios from 'axios'
import { setupCache } from 'axios-cache-interceptor'
import { cleanError } from '~/utils/clean-error'

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig().public

  const instance = setupCache(axios.create({
    baseURL: config.SCOT_API,
    withCredentials: false
  }), config.AXIOS_CACHE_CONFIG || {})

  instance.interceptors.request.use((req) => {
    req.params = { ...req.params, token: config.TOKEN }

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
      scot: instance
    }
  }
})
