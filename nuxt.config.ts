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
    public: {
      ...tribeConfig
    }
  },

  // Legacy dir is excluded from the build; pieces are ported in phase by phase.
  ignore: ['legacy/**']
})
