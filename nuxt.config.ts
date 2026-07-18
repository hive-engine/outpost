// Nuxt 3 config — migration in progress (see MIGRATION.md).
// Ported incrementally; legacy Nuxt 2 config preserved at legacy/nuxt.config.js.old
import * as tribeConfig from './config'

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
    preference: 'light'
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

    public: {
      ...tribeConfig
    }
  },

  // Legacy dir is excluded from the build; pieces are ported in phase by phase.
  ignore: ['legacy/**'],

  hooks: {
    // Assign the legacy route names by file path. definePageMeta({ name }) only
    // extracts reliably from <script setup>; these pages keep Options-API <script>,
    // and the `@[user]` folder auto-names routes with an `@`, breaking {name:'user-*'}
    // links. Centralize the naming here so every <nuxt-link :to="{name}"> resolves.
    'pages:extend' (pages) {
      const names: Record<string, string> = {
        'pages/@[user]/[post].vue': 'user-post',
        'pages/@[user]/index.vue': 'user',
        'pages/@[user]/comments.vue': 'user-comments',
        'pages/@[user]/replies.vue': 'user-replies',
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
