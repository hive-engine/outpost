import Vue from 'vue'
import PincodeInput from 'vue-pincode-input'
import Loading from '@/components/Loading.vue'

if (!Vue.__myGlobalMixin__) {
  Vue.__myGlobalMixin__ = true

  Vue.mixin({
    components: {
      Loading,
      PincodeInput
    },

    data () {
      return {
        loading: false
      }
    },

    methods: {
      scrollToTop (top = 0) {
        if (!process.client) { return }

        window.scroll({
          top,
          left: 0,
          behavior: 'smooth'
        })
      },

      sleep (ms) {
        return new Promise(resolve => setTimeout(resolve, ms))
      }
    }
  })
}
