// Nuxt 3 config — migration in progress (see MIGRATION.md).
// Ported incrementally; legacy Nuxt 2 config preserved at legacy/nuxt.config.js.old
import * as tribeConfig from './config'

export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  ssr: true,
  devtools: { enabled: false },

  modules: [
    '@pinia/nuxt'
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
  ignore: ['legacy/**']
})
