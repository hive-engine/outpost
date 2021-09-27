import { version } from './package.json'

export const TOKEN = 'MEME'
export const IS_HIVE = true
export const APP_DOMAIN = 'https://www.hiveme.me' // Hard code it or use environment varible
export const APP_TITLE = 'MemeHive'
export const APP = `memehive/${version}`
export const IMAGES_CDN = 'https://images.hive.blog/'
export const IMAGE_UPLOAD_SERVER = 'https://images.hive.blog'
export const NODES = ['https://api.hive.blog', 'https://api.deathwing.me', 'https://rpc.ausbit.dev', 'https://api.ha.deathwing.me']
export const COMMUNITY_CATEGORY = 'hive-104024'
export const AUTO_ADD_COMMUNITY = true
export const SCOT_TAG = 'memehive'
export const SCOT_TAG_FIRST = true
export const MAX_TAG = 10
export const SCOT_API = 'https://hetest.cryptoempirebot.com/scot'
export const SCOT_QUERY_LIMIT = 10
export const CURATED_FEED = false
export const CURATED_FEED_ACCOUNT = 'memehive'
export const SIDECHAIN_ID = 'ssc-mainnet-hive'
export const SIDECHAIN_RPC = 'https://ha.herpc.dtools.dev'
export const SIDECHAIN_EXPLORER = 'https://he.dtools.dev'
export const SIDECHAIN_HISTORY_API = 'https://history.hive-engine.com'
export const NUMBER_OF_UNSTAKE_TRX = 4
export const MAX_UPLOAD_SIZE = 8
export const AXIOS_CACHE_CONFIG = {
  maxAge: 0 * 60 * 1000, // 0 minutes
  exclude: { query: false }
}
export const NFT_ENABLED = true
export const NFT_SYMBOL = 'VIRAL'
export const NFT_MARKETPLACE = 'memehive'
export const NFT_MARKETPLACE_API = 'https://api.marketplace.tribaldex.com'
export const DTF_ENABLED = false
export const DTF_ID = ''
export const POOL_ENABLED = false
export const IPFS_GATEWAY = 'https://ipfs.tribaldex.com'
