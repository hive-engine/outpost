import { setupCache } from 'axios-cache-interceptor'

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

  inject('scot', SCOTAPI)
}
