export default ({ $config, $axios }, inject) => {
  const SCOTAPI = $axios.create({
    baseURL: $config.SCOT_API,
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
