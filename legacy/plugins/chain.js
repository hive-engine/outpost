import { Asset, Client, PrivateKey, PublicKey, cryptoUtils, utils } from '@hiveio/dhive'

export default ({ app, $config }, inject) => {
  let rpcNode = app.$cookies.get('mainchain_rpc') || $config.NODES[0]

  rpcNode = Array.from(new Set([rpcNode, ...$config.NODES]))

  const client = new Client(rpcNode, { failoverThreshold: 20, consoleOnFailover: true })

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

  inject('chain', chain)
}
