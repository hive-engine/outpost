// Nuxt 3 config — migration in progress (see MIGRATION.md).
// Ported incrementally; legacy Nuxt 2 config preserved at legacy/nuxt.config.js.old
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import * as tribeConfig from './config'

// Analytics (PRODUCTION ONLY): self-hosted Umami + Google Analytics. Guarded on
// the production domain so dev/staging traffic never pollutes prod stats. These
// were in the Nuxt 2 head and must be preserved through the migration.
const APP_DOMAIN = process.env.APP_DOMAIN || tribeConfig.APP_DOMAIN
const TRACKING_SCRIPTS = APP_DOMAIN === 'https://www.thebbhproject.com'
  ? [
      { src: 'https://www.googletagmanager.com/gtag/js?id=G-RXPYJVHM4X', async: true },
      { src: '/js/ga.js' },
      { src: '/u.js', defer: true, 'data-website-id': 'bab55116-61ad-46a9-818f-d29b209fe8f7', 'data-host-url': 'https://www.thebbhproject.com' }
    ]
  : []

export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  ssr: true,
  devtools: { enabled: false },

  modules: [
    '@pinia/nuxt',
    '@nuxtjs/color-mode',
    '@bootstrap-vue-next/nuxt'
  ],

  colorMode: {
    preference: 'dark' // Web3 Bold is dark-first
  },

  app: {
    head: {
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&display=swap' }
      ],
      // Light-theme variable overrides. Injected here (not via SCSS) so the rule is
      // guaranteed in <head>; @nuxtjs/color-mode adds the `.light` class to <html>.
      style: [
        { id: 'w3-light-theme', innerHTML: 'html.light{--w3-bg:#f4f5f7;--w3-bg-2:#ffffff;--w3-panel:#ffffff;--w3-panel-2:#eceef1;--w3-border:rgba(0,0,0,.12);--w3-text:#17181c;--w3-muted:#5c626c;--bs-body-bg:var(--w3-bg);--bs-body-color:var(--w3-text);--bs-border-color:var(--w3-border)}html.light .navbar{background:rgba(255,255,255,.8)!important}html.light .card,html.light .navbar-btn{box-shadow:0 1px 3px rgba(0,0,0,.06)}' }
      ],
      script: TRACKING_SCRIPTS
    }
  },

  // Legacy templates reference components by FILENAME only (<post-summary>, <votes>,
  // <comment>…). Nuxt 3 default auto-import prefixes the directory (CardsPostSummary),
  // so those kebab tags render as unresolved empty elements. pathPrefix:false makes
  // auto-import name components by filename, matching the legacy usage 1:1.
  components: [{ path: '~/components', pathPrefix: false }],

  css: [
    'bootstrap-vue-next/dist/bootstrap-vue-next.css',
    '~/assets/scss/app.scss'
  ],

  // Parity with Nuxt 2 `publicRuntimeConfig: { ...config }` — every constant from
  // config.js is available via useRuntimeConfig().public (APP_DOMAIN stays env-driven
  // inside config.js itself, preserving dev/prod parity).
  runtimeConfig: {
    // Server-only (overridable at runtime via NUXT_SESSION_SECRET / NUXT_HS_API_KEY;
    // defaults read from .env at build time — nuxi auto-loads .env during build).
    sessionSecret: process.env.SESSION_SECRET || '',
    hsApiKey: process.env.HS_API_KEY || '',
    // 3Speak embed API key (sk_...) — server-only; never exposed to the browser.
    // Set THREESPEAK_API_KEY in the (gitignored) .env.
    threespeakApiKey: process.env.THREESPEAK_API_KEY || '',
    // Arcade weekly payout — server-only secrets (gitignored .env). BBHBOT_ACTIVE_KEY
    // = BBHBot's Hive active key used to send prize + burn transfers; ARCADE_ADMIN_TOKEN
    // = shared secret the payout cron presents to POST /api/v1/games/payout. Absent =
    // payouts are disabled (route no-ops), safe to deploy without them.
    bbhbotActiveKey: process.env.BBHBOT_ACTIVE_KEY || '',
    arcadeAdminToken: process.env.ARCADE_ADMIN_TOKEN || '',

    public: {
      ...tribeConfig
    }
  },

  // Legacy dir is excluded from the build; pieces are ported in phase by phase.
  ignore: ['legacy/**'],

  nitro: {
    // Persistent, account-scoped drafts store. fs base is relative to the server's
    // working dir (outside .output, so it survives rebuilds). Override with
    // DRAFTS_DIR if you want it elsewhere.
    storage: {
      drafts: { driver: 'fsLite', base: process.env.DRAFTS_DIR || './.data/drafts' },
      bookmarks: { driver: 'fsLite', base: process.env.BOOKMARKS_DIR || './.data/bookmarks' },
      scores: { driver: 'fsLite', base: process.env.SCORES_DIR || './.data/scores' },
      gamesessions: { driver: 'fsLite', base: process.env.GAME_SESSIONS_DIR || './.data/gamesessions' },
      winners: { driver: 'fsLite', base: process.env.WINNERS_DIR || './.data/winners' },
      puzzle: { driver: 'fsLite', base: process.env.PUZZLE_DIR || './.data/puzzle' }
    }
  },

  hooks: {
    // webpack 4 (Nuxt 2) injected a global Buffer; Vite does not. dhive/triplesec/
    // signing reference global Buffer in the browser. Polyfill it — CLIENT BUILD ONLY
    // (on the server Node already has Buffer; polyfilling there breaks SSR).
    'vite:extendConfig' (config, { isClient }) {
      if (isClient) {
        config.plugins = config.plugins || []
        config.plugins.push(nodePolyfills({ include: ['buffer'], globals: { Buffer: true, process: false, global: false } }))
      }
    },

    // Assign the legacy route names by file path. definePageMeta({ name }) only
    // extracts reliably from <script setup>; these pages keep Options-API <script>,
    // and the `@[user]` folder auto-names routes with an `@`, breaking {name:'user-*'}
    // links. Centralize the naming here so every <nuxt-link :to="{name}"> resolves.
    'pages:extend' (pages) {
      const names: Record<string, string> = {
        'pages/@[user]/[post].vue': 'user-post',
        'pages/@[user]/index.vue': 'user',
        'pages/@[user]/posts.vue': 'user-posts',
        'pages/@[user]/comments.vue': 'user-comments',
        'pages/@[user]/replies.vue': 'user-replies',
        'pages/@[user]/mentions.vue': 'user-mentions',
        'pages/@[user]/wallet.vue': 'user-wallet',
        'pages/@[user]/settings.vue': 'user-settings',
        'pages/@[user]/followers.vue': 'user-followers',
        'pages/@[user]/following.vue': 'user-following',
        'pages/@[user]/feed.vue': 'user-feed',
        'pages/[sort]/index.vue': 'sort',
        'pages/[sort]/[tag].vue': 'sort-tag'
      }

      const walk = (arr: any[]) => arr.forEach((p) => {
        for (const suffix in names) {
          if (p.file && p.file.replace(/\\/g, '/').endsWith(suffix)) { p.name = names[suffix] }
        }
        if (p.children) { walk(p.children) }
      })

      walk(pages)
    }
  }
})
