import { defineStore } from 'pinia'
import { useTribeStore } from '~/stores/tribe'

export const usePoolStore = defineStore('pool', {
  actions: {
    requestSwapTokens ({ tokenPair, tokenSymbol, tokenAmount, minAmountOut }) {
      const config = useRuntimeConfig().public

      const json = {
        contractName: 'marketpools',
        contractAction: 'swapTokens',
        contractPayload: {
          tokenPair,
          tokenSymbol,
          tokenAmount: tokenAmount.toString(),
          tradeType: 'exactInput',
          minAmountOut: minAmountOut.toString()
        }
      }

      const jsonData = {
        id: config.SIDECHAIN_ID,
        keyType: 'Active',
        json,
        message: `Swap Tokens (${tokenPair})`,
        eventName: 'dieselpool-swap-successful'
      }

      useTribeStore().requestBroadcastJson(jsonData)
    },

    requestCreatePool (tokenPair) {
      const config = useRuntimeConfig().public

      const json = {
        contractName: 'marketpools',
        contractAction: 'createPool',
        contractPayload: {
          tokenPair
        }
      }

      const jsonData = {
        id: config.SIDECHAIN_ID,
        keyType: 'Active',
        json,
        message: `Create Pool (${tokenPair})`,
        eventName: 'dieselpool-create-successful'
      }

      useTribeStore().requestBroadcastJson(jsonData)
    },

    requestAddLiquidity ({ tokenPair, baseQuantity, quoteQuantity }) {
      const config = useRuntimeConfig().public

      const json = {
        contractName: 'marketpools',
        contractAction: 'addLiquidity',
        contractPayload: {
          tokenPair,
          baseQuantity: baseQuantity.toString(),
          quoteQuantity: quoteQuantity.toString()
        }
      }

      const jsonData = {
        id: config.SIDECHAIN_ID,
        keyType: 'Active',
        json,
        message: `Add Liquidity (${tokenPair})`,
        eventName: 'dieselpool-add-successful'
      }

      useTribeStore().requestBroadcastJson(jsonData)
    },

    requestRemoveLiquidity ({ tokenPair, sharesOut }) {
      const config = useRuntimeConfig().public

      const json = {
        contractName: 'marketpools',
        contractAction: 'removeLiquidity',
        contractPayload: {
          tokenPair,
          sharesOut: sharesOut.toString()
        }
      }

      const jsonData = {
        id: config.SIDECHAIN_ID,
        keyType: 'Active',
        json,
        message: `Remove Liquidity (${tokenPair})`,
        eventName: 'dieselpool-remove-successful'
      }

      useTribeStore().requestBroadcastJson(jsonData)
    }
  }
})
