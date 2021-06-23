import Vue from 'vue'
import VueLazyload from 'vue-lazyload'

Vue.use(VueLazyload, {
  error: 'https://nftshowroom.sfo2.cdn.digitaloceanspaces.com/DQmTcq7gMsNQTthZ83pqQSQXvJYZ9LBuFZa45gczLb7NaLv-placeholder.png',
  loading: 'https://nftshowroom.sfo2.cdn.digitaloceanspaces.com/DQmPawbtZycKuiiqpKe9j2WgmCjiFRo4ZcKitfd1QfrDVu7-animated-loading.gif'
})
