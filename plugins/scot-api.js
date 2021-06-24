import { setupCache } from 'axios-cache-adapter'

export default ({ $config, $axios }, inject) => {
  const { adapter } = setupCache({
    maxAge: 5 * 60 * 1000,
    exclude: { query: false }
  })

  const SCOTAPI = $axios.create({
    baseURL: $config.SCOT_API,
    adapter,
    credentials: true
  })

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
