// Nuxt 3 config — migration in progress (see MIGRATION.md).
// Ported incrementally; legacy Nuxt 2 config preserved at legacy/nuxt.config.js.old
export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  ssr: true,
  devtools: { enabled: false },

  // Dev/staging parity: origin + port come from .env (see DEV.md).
  runtimeConfig: {
    public: {
      appDomain: process.env.APP_DOMAIN || 'https://www.thebbhproject.com'
    }
  },

  // P0 skeleton only serves app.vue + pages/. Legacy dir is excluded from the build.
  ignore: ['legacy/**']
})
