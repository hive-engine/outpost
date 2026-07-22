import { version } from './package.json'

export const TOKEN = 'BBHO'
export const IS_HIVE = true
export const APP_DOMAIN = process.env.APP_DOMAIN || 'https://www.thebbhproject.com'
export const APP_TITLE = 'The BBH Project'
export const APP = `bbhproject/${version}`
export const IMAGES_CDN = 'https://images.hive.blog/'
export const IMAGE_UPLOAD_SERVER = 'https://images.hive.blog'
export const NODES = ['https://api.hive.blog', 'https://api.deathwing.me', 'https://api.openhive.network', 'https://rpc.mahdiyari.info', 'https://techcoderx.com']
export const COMMUNITY_CATEGORY = 'hive-110490'
export const AUTO_ADD_COMMUNITY = false
export const SCOT_TAG = 'bbh'
export const SCOT_TAG_FIRST = true
export const MAX_TAG = 10
export const ADD_COMMEMT_FOOTER = true
export const COMMENT_FOOTER = `Posted using [${APP_TITLE}](%post_url%)`
export const SCOT_API = 'https://smt-api.enginerpc.com'
export const SCOT_QUERY_LIMIT = 10
export const CURATED_FEED = false
export const CURATED_FEED_ACCOUNT = 'tribe-dev'
// --- Chats: short-form feed (Snaps/Threads/Waves-style) ---------------------
// Chats are top-level comments on rolling "container" posts published by
// CHATS_ACCOUNT. The account's recent posts ARE the containers (newest = active).
// TODO(owner): before prod, point CHATS_ACCOUNT at the BBH-controlled chats
// account and enable the daily-container cron. Defaults to peak.snaps so the
// feed shows live short-form content during dev/testing.
export const CHATS_ENABLED = true
export const CHATS_ACCOUNT = process.env.CHATS_ACCOUNT || 'peak.snaps'
export const CHATS_CONTAINERS_TO_LOAD = 3 // aggregate the N most-recent containers
export const CHATS_TAG = 'bbh-chat' // tag stamped on every Chat's json_metadata
export const SIDECHAIN_ID = 'ssc-mainnet-hive'
export const SIDECHAIN_RPC = 'https://enginerpc.com'
export const SIDECHAIN_EXPLORER = 'https://he.dtools.dev'
export const SIDECHAIN_HISTORY_API = 'https://history.hive-engine.com'
export const NUMBER_OF_UNSTAKE_TRX = 1
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
