export default function ({ $axios, app }) {
  $axios.onRequest((config) => {
    const token = app.$csrfToken()

    if (!config.headers['X-CSRF-Token'] && token) { config.headers['X-CSRF-Token'] = token }

    return config
  })
}
