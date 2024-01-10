import { setupCache } from 'axios-cache-interceptor'

export default ({ $config, $axios }, inject) => {
  const SCOTAPI = setupCache($axios.create({
    baseURL: $config.SCOT_API,
    withCredentials: false
  }))

  SCOTAPI.onRequest((config) => {
    const params = { ...config.params, token: $config.TOKEN }

    if ($config.IS_HIVE && config.url.startsWith('@')) {
      params.hive = 1
    }

    config.params = params

    return config
  })

  inject('scot', SCOTAPI)
}
