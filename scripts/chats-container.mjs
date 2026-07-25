#!/usr/bin/env node
// Rolling "container" creator for the Chats feed.
//
// Chats (short-form posts) are top-level comments on a container post owned by
// CHATS_ACCOUNT. This script ensures the CURRENT container exists: it creates a
// dated container post (permlink `${PREFIX}YYYY-MM-DD`) if today's is missing.
// Idempotent — safe to run on a daily systemd timer / cron. Mirrors how PeakD
// Snaps / InLeo Threads roll their containers.
//
// Config comes from the environment (load via scripts/chats.env, gitignored):
//   CHATS_ACCOUNT           the Hive account that owns containers (posting auth)
//   CHATS_POSTING_KEY       that account's PRIVATE POSTING key (WIF)
//   CHATS_CONTAINER_PREFIX  permlink prefix, e.g. "bbh-chats-"  (default: bbh-chats-)
//   CHATS_TAG               category/first tag         (default: bbh-chat)
//   CHATS_APP               app tag in json_metadata   (default: bbhproject)
//   HIVE_NODE               RPC node (default: https://api.hive.blog)
//
// Usage:  node scripts/chats-container.mjs           # ensure today's container
//         node scripts/chats-container.mjs --dry-run # print what it would do

import { Client, PrivateKey } from '@hiveio/dhive'

const NODES = [process.env.HIVE_NODE || 'https://api.hive.blog', 'https://api.deathwing.me', 'https://api.openhive.network']
const ACCOUNT = process.env.CHATS_ACCOUNT
const KEY = process.env.CHATS_POSTING_KEY
const PREFIX = process.env.CHATS_CONTAINER_PREFIX || 'bbh-chats-'
const TAG = process.env.CHATS_TAG || 'bbh-chat'
const APP = process.env.CHATS_APP || 'bbhproject'
const DRY = process.argv.includes('--dry-run')

if (!ACCOUNT) { console.error('✖ CHATS_ACCOUNT is required'); process.exit(1) }
if (!KEY && !DRY) { console.error('✖ CHATS_POSTING_KEY is required'); process.exit(1) }

// UTC date so the container rolls at a predictable, timezone-independent boundary.
const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
const permlink = `${PREFIX}${today}`
const client = new Client(NODES, { timeout: 8000, failoverThreshold: 2 })

const humanDate = new Date(`${today}T00:00:00Z`).toLocaleDateString('en-GB', {
  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC'
})

async function main () {
  // Already there? Nothing to do.
  const existing = await client.database.call('get_content', [ACCOUNT, permlink]).catch(() => null)
  if (existing && existing.author === ACCOUNT) {
    console.log(`✓ container already exists: @${ACCOUNT}/${permlink}`)
    return
  }

  const title = `BBH Chats — ${humanDate}`
  const body = [
    `### BBH Chats — ${humanDate}`,
    '',
    'This is the daily container for **Chats**, the short-form feed on ' +
    '[The BBH Project](https://www.thebbhproject.com/chats). Replies to this post ' +
    'are the Chats shown in the timeline. Jump in over on the site!'
  ].join('\n')

  const jsonMetadata = JSON.stringify({ app: APP, tags: [TAG], format: 'markdown', container: true })

  const comment = {
    parent_author: '',
    parent_permlink: TAG,
    author: ACCOUNT,
    permlink,
    title,
    body,
    json_metadata: jsonMetadata
  }

  if (DRY) {
    console.log('— DRY RUN — would broadcast comment:')
    console.log(JSON.stringify(comment, null, 2))
    return
  }

  await client.broadcast.comment(comment, PrivateKey.fromString(KEY))
  console.log(`✓ created container: @${ACCOUNT}/${permlink}`)
}

main().catch((e) => { console.error('✖ failed:', e.message || e); process.exit(1) })
