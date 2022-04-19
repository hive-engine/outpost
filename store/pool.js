export const actions = {
  requestSwapTokens ({ dispatch }, { tokenPair, tokenSymbol, tokenAmount, minAmountOut }) {
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
      id: this.$config.SIDECHAIN_ID,
      keyType: 'Active',
      json,
      message: `Swap Tokens (${tokenPair})`,
      eventName: 'dieselpool-swap-successful'
    }

    dispatch('requestBroadcastJson', jsonData, { root: true })
  },

  requestCreatePool ({ dispatch }, tokenPair) {
    const json = {
      contractName: 'marketpools',
      contractAction: 'createPool',
      contractPayload: {
        tokenPair
      }
    }

    const jsonData = {
      id: this.$config.SIDECHAIN_ID,
      keyType: 'Active',
      json,
      message: `Create Pool (${tokenPair})`,
      eventName: 'dieselpool-create-successful'
    }

    dispatch('requestBroadcastJson', jsonData, { root: true })
  },

  requestAddLiquidity ({ dispatch }, { tokenPair, baseQuantity, quoteQuantity }) {
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
      id: this.$config.SIDECHAIN_ID,
      keyType: 'Active',
      json,
      message: `Add Liquidity (${tokenPair})`,
      eventName: 'dieselpool-add-successful'
    }

    dispatch('requestBroadcastJson', jsonData, { root: true })
  },

  requestRemoveLiquidity ({ dispatch }, { tokenPair, sharesOut }) {
    const json = {
      contractName: 'marketpools',
      contractAction: 'removeLiquidity',
      contractPayload: {
        tokenPair,
        sharesOut: sharesOut.toString()
      }
    }

    const jsonData = {
      id: this.$config.SIDECHAIN_ID,
      keyType: 'Active',
      json,
      message: `Remove Liquidity (${tokenPair})`,
      eventName: 'dieselpool-remove-successful'
    }

    dispatch('requestBroadcastJson', jsonData, { root: true })
  }
}
