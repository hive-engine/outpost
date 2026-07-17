import Vue from 'vue'
import VueLazyload from 'vue-lazyload'

Vue.use(VueLazyload, {
  error: 'https://cdn.tribaldex.com/tribaldex/ui/image-placeholder.svg',
  loading: 'https://cdn.tribaldex.com/tribaldex/ui/image-loading.svg'
})
