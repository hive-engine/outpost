export default ({ app, store, $config, $axios }, inject) => {
  const nftm = $axios.create({
    baseURL: $config.NFT_MARKETPLACE_API
  })

  nftm.onRequest((config) => {
    const params = { ...config.params, site: $config.NFT_MARKETPLACE }

    if (app.$cookies.get('nftm_access_token')) {
      config.headers.Authorization = `Bearer ${app.$cookies.get('nftm_access_token')}`
    }

    config.params = params

    return config
  })

  nftm.onError((error) => {
    const code = parseInt(error.response && error.response.status)
    const originalRequest = error.config

    if (code === 401 && !originalRequest.__isRetryRequest) {
      originalRequest.__isRetryRequest = true

      return new Promise((resolve, reject) => {
        nftm.post('auth/refresh', { site: $config.NFT_MARKETPLACE, refresh_token: app.$cookies.get('nftm_refresh_token') })
          .then((response) => {
            if (response.status === 200 && response.data.user) {
              app.$cookies.set('nftm_access_token', response.data.access_token)
              originalRequest.headers.Authorization = `Bearer ${response.data.access_token}`

              resolve(response)
            } else {
              reject(new Error('Failed to refresh access_token!'))
            }
          }).catch((e) => {
            app.$cookies.remove('nftm_access_token')
            app.$cookies.remove('nftm_refresh_token')

            store.commit('nftmarketplace/SET_USER', { user: null }, { root: true })

            reject(new Error('Failed to refresh access_token!'))
          })
      })
        .then((res) => {
          return nftm(originalRequest)
        }).catch((e) => {
          app.router.push({ to: 'nfts' })
        })
    }
  })

  inject('nftm', nftm)
}
