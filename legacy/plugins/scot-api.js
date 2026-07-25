import { setupCache } from 'axios-cache-interceptor'
import { cleanError } from '@/utils/clean-error'

export default ({ $config, $axios }, inject) => {
  const SCOTAPI = setupCache($axios.create({
    baseURL: $config.SCOT_API,
    withCredentials: false
  }))

  SCOTAPI.onRequest((config) => {
    const params = { ...config.params, token: $config.TOKEN }

    config.params = params

    return config
  })

  // Reject with a plain, serializable error (prevents @nuxt/devalue SSR crashes).
  SCOTAPI.interceptors.response.use(response => response, error => Promise.reject(cleanError(error)))

  inject('scot', SCOTAPI)
}
