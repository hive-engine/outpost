import { setupCache } from 'axios-cache-adapter'

export default function ({ $config }) {
  const { adapter } = setupCache($config)

  this.nuxt.hook('vue-renderer:ssr:prepareContext', (ssrContext) => {
    ssrContext.$axiosCache = adapter
  })
}
