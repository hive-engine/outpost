import { setupCache } from 'axios-cache-adapter'

export default ({ $config, $axios }, inject) => {
  const { adapter } = setupCache($config.AXIOS_CACHE_CONFIG)

  const SCOTAPI = $axios.create({
    baseURL: $config.SCOT_API,
    adapter,
    withCredentials: false
  })

  SCOTAPI.onRequest((config) => {
    const params = { ...config.params, token: $config.TOKEN }

    config.params = params

    return config
  })

  inject('scot', SCOTAPI)
}
