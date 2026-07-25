// NFT marketplace API client — ported from legacy/plugins/nftmarketplace.js.
// (NFT_ENABLED is false for BBH; ported for completeness/parity.)
// Token-refresh-on-401 flow preserved; Vuex commit -> Pinia store call.
import axios from 'axios'
import { useNftMarketplaceStore } from '~/stores/nftmarketplace'

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig().public

  const nftm = axios.create({
    baseURL: config.NFT_MARKETPLACE_API
  })

  nftm.interceptors.request.use((req) => {
    req.params = { ...req.params, site: config.NFT_MARKETPLACE }

    const accessToken = useCookie('nftm_access_token').value

    if (accessToken) {
      req.headers.Authorization = `Bearer ${accessToken}`
    }

    return req
  })

  nftm.interceptors.response.use(
    response => response,
    async (error) => {
      const code = parseInt(error.response && error.response.status)
      const originalRequest = error.config

      if (code === 401 && !originalRequest.__isRetryRequest) {
        originalRequest.__isRetryRequest = true

        try {
          const refreshToken = useCookie('nftm_refresh_token').value
          const response = await nftm.post('auth/refresh', {
            site: config.NFT_MARKETPLACE,
            refresh_token: refreshToken
          })

          if (response.status === 200 && response.data.user) {
            useCookie('nftm_access_token').value = response.data.access_token
            originalRequest.headers.Authorization = `Bearer ${response.data.access_token}`

            return nftm(originalRequest)
          }

          throw new Error('Failed to refresh access_token!')
        } catch (e) {
          useCookie('nftm_access_token').value = null
          useCookie('nftm_refresh_token').value = null

          useNftMarketplaceStore().SET_USER({ user: null })

          return navigateTo('/nfts')
        }
      }

      return Promise.reject(error)
    }
  )

  // @nuxtjs/axios-style sugar used across the legacy codebase
  nftm.$get = (url, cfg) => nftm.get(url, cfg).then(r => r.data)
  nftm.$post = (url, data, cfg) => nftm.post(url, data, cfg).then(r => r.data)

  return {
    provide: {
      nftm
    }
  }
})
