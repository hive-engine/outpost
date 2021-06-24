import { setupCache } from 'axios-cache-adapter'

export default function ({ $config, $axios, app, ssrContext }) {
  if (process.server) {
    $axios.defaults.adapter = ssrContext.$axiosCache.adapter
  } else {
    const { adapter } = setupCache($config)

    $axios.defaults.adapter = adapter
  }

  $axios.onRequest((config) => {
    const token = app.$csrfToken()

    if (!config.headers['X-CSRF-Token'] && token) { config.headers['X-CSRF-Token'] = token }

    return config
  })
}
