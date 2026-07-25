// mavon-editor v3 (Vue 3) — ported from legacy plugin (Vue.use → vueApp.use).
import mavonEditor from 'mavon-editor'
import 'mavon-editor/dist/css/index.css'

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.use(mavonEditor)
})
