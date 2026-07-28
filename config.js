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
export const CHATS_ACCOUNT = process.env.CHATS_ACCOUNT || 'thebbhproject'
export const CHATS_CONTAINERS_TO_LOAD = 3 // aggregate the N most-recent containers
export const CHATS_TAG = 'bbh-chat' // tag stamped on every Chat's json_metadata
// When CHATS_ACCOUNT is a shared/existing account, container posts are identified
// by this permlink prefix so the account's *normal* posts are never mistaken for
// containers. Empty string = treat every recent post as a container (peak.snaps
// demo, whose blog is only containers). The container cron creates permlinks like
// `${CHATS_CONTAINER_PREFIX}YYYY-MM-DD`.
export const CHATS_CONTAINER_PREFIX = process.env.CHATS_CONTAINER_PREFIX || 'bbh-chats-'
// Aggregated short-form sources for the Chats feed. Each is container-based
// (short-form posts are replies to a rolling container post). `scheme: 'date'`
// derives today's permlink deterministically (`${prefix}YYYY-MM-DD`); `'posts'`
// looks up the account's most-recent posts as containers. `tag` is stamped when
// posting to that source. Posting targets the *viewed* source's live container.
// `scheme: 'date'` derives today's container permlink; `'posts'` looks up the
// account's recent posts as containers; `'tag'` reads a Hive tag directly
// (get_ranked_posts) — no container, so it's read-only (compose falls back home).
export const CHATS_SOURCES = [
  { key: 'bbh', label: 'BBH Chats', account: 'thebbhproject', scheme: 'date', prefix: 'bbh-chats-', tag: 'bbh-chat', home: true },
  { key: 'snaps', label: 'Snaps', account: 'peak.snaps', scheme: 'posts', tag: 'snaps' },
  { key: 'threads', label: 'Threads', account: 'leothreads', scheme: 'posts', tag: 'leofinance' },
  { key: 'waves', label: 'Waves', account: 'ecency.waves', scheme: 'posts', tag: 'ecency' },
  { key: 'hangs', label: 'Hangs', account: 'slothbuzz.hangs', scheme: 'posts', tag: 'slothbuzz', readonly: true },
  { key: 'dbuzz', label: 'D.Buzz', scheme: 'tag', hiveTag: 'dbuzz', tag: 'dbuzz', readonly: true }
]
// --- 3Speak video/shorts integration ---------------------------------------
export const THREESPEAK_ENABLED = true
export const THREESPEAK_EMBED_HOST = 'https://embed2.3speak.tv' // upload + bridge
export const THREESPEAK_PLAYER = 'https://play.3speak.tv/embed'
export const THREESPEAK_APP = 'thebbhproject' // frontend_app (unlisted on 3speak.tv)
export const THREESPEAK_COMMUNITY = 'hive-181335' // 3Speak community (post parent)
export const THREESPEAK_SHORTS_MAX_SEC = 120
// MANDATORY beneficiaries on every embed upload (sorted by account ascending):
// 10% threespeakfund + 1% encoder.pay. Weights are 1/100th of a %.
export const THREESPEAK_BENEFICIARIES = [
  { account: 'encoder.pay', weight: 100 },
  { account: 'threespeakfund', weight: 1000 }
]
// Token backend: 'hive-engine' (SCOT, default) or 'magi' (VSC, added later).
// Selects which tokenProvider the app uses ($token) so the Outpost can run on
// either chain — switchable with one flag, reusable across tribes.
export const TOKEN_BACKEND = process.env.TOKEN_BACKEND || 'hive-engine'
// Promote Post (burn TOKEN to advertise a post) — disabled on production at the
// owner's request (Bradley). Enabled by default; set PROMOTE_ENABLED=false in the
// prod .env to hide it there while keeping it available in dev.
export const PROMOTE_ENABLED = process.env.PROMOTE_ENABLED !== 'false'
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
