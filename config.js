import { version } from './package.json'

export const TOKEN = 'HON'
export const IS_HIVE = true
export const APP_DOMAIN = 'https://honouree.com'
// export const APP_DOMAIN = 'http://localhost:8080'
export const APP_TITLE = 'Honouree'
export const APP = `honouree/${version}`
export const IMAGES_CDN = 'https://images.hive.blog/'
export const IMAGE_UPLOAD_SERVER = 'https://images.hive.blog'
export const NODES = ['https://api.deathwing.me', 'https://api.hive.blog', 'https://rpc.ausbit.dev', 'https://api.ha.deathwing.me']
export const COMMUNITY_CATEGORY = 'hive-110490'
export const AUTO_ADD_COMMUNITY = false
export const SCOT_TAG = 'honouree'
export const SCOT_TAG_FIRST = true
export const MAX_TAG = 10
export const ADD_COMMEMT_FOOTER = true
export const COMMENT_FOOTER = `Posted using [${APP_TITLE}](%post_url%)`
export const SCOT_API = 'https://ha.smt-api.dtools.dev'
export const SCOT_QUERY_LIMIT = 10
export const CURATED_FEED = false
export const CURATED_FEED_ACCOUNT = 'tribe-dev'
export const SIDECHAIN_ID = 'ssc-mainnet-hive'
export const SIDECHAIN_RPC = 'https://ha.herpc.dtools.dev'
export const SIDECHAIN_EXPLORER = 'https://he.dtools.dev'
export const SIDECHAIN_HISTORY_API = 'https://history.hive-engine.com'
export const NUMBER_OF_UNSTAKE_TRX = 7
export const MAX_UPLOAD_SIZE = 8
export const AXIOS_CACHE_CONFIG = {
  ttl: 0 * 60 * 1000 // 0 minutes
  // exclude: { query: false }
}
export const NFT_ENABLED = false
export const NFT_SYMBOL = 'PAL'
export const NFT_MARKETPLACE = 'palnet'
export const NFT_MARKETPLACE_API = 'https://api.marketplace.tribaldex.com'
export const DTF_ENABLED = false
export const DTF_ID = 'PAL:PAL'
export const POOL_ENABLED = false
export const IPFS_GATEWAY = 'https://ipfs.tribaldex.com'
export const OUTPOST_ONBOARD = false
export const OUTPOST_ONBOARD_API = 'https://onboard-api.tribaldex.com'
export const OUTPOST_ONBOARD_ID = ''
export const HCAPTCHA_KEY = ''
