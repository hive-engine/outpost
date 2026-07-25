// Hive chain client — ported from legacy/plugins/chain.js (inject -> provide).
import { Asset, Client, PrivateKey, PublicKey, cryptoUtils, utils } from '@hiveio/dhive'

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig().public

  // Preserve the user's preferred RPC node (cookie-universal-nuxt -> useCookie)
  const preferred = useCookie('mainchain_rpc').value
  const rpcNodes = Array.from(new Set([...(preferred ? [preferred] : []), ...config.NODES]))

  const client = new Client(rpcNodes, { failoverThreshold: 20, consoleOnFailover: true })

  const getClient = () => client

  const chain = {
    Asset,
    Client,
    PrivateKey,
    PublicKey,
    cryptoUtils,
    ...utils,
    client,
    getClient
  }

  return {
    provide: {
      chain
    }
  }
})
