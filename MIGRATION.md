# Nuxt 2 / Vue 2 → Nuxt 3 / Vue 3 migration

Branch: `migration/nuxt3` (off `dev`). Worked/tested on dev.thebbhproject.com staging.
Status: **assessment complete, foundation pending strategic decision.**

## Assessment (from codebase scan, 2026-07-17)

### The dominant cost: BootstrapVue (UI layer)
- **47 distinct `b-*` components**, ~1300 usages, across **84 of 92 .vue files (91%)**.
- 60+ programmatic `$bvModal` calls; 2 directives (`v-b-tooltip`, `v-b-toggle`).
- BootstrapVue has no official Vue 3 release. **Mitigation: `bootstrap-vue-next`** (community Vue 3
  port) covers most `b-*` components with similar APIs → adjust-for-API-diffs rather than full rewrite.
  Modal/toast programmatic API differs most (needs a composable wrapper).

### Vue 3 breaking patterns
- **Event bus: 152 uses across 45 files** (`$eventBus.$on/$off/$emit`). `$on/$off` removed in Vue 3.
  → replace the `new Vue()` bus with **mitt** (same on/off/emit shape). Mechanical but wide.
- Vuex: **9 modules (~2,470 lines)** → **Pinia** (recommended) or Vuex 4.
- `Vue.use` ×7 (plugins), `Vue.mixin` ×1 (global-mixins) → `nuxtApp.vueApp.use` / composables.
- `.sync` ×2 (Votes.vue) → `v-model:`. Good news: **no** `$listeners/$children/$scopedSlots/.native/
  functional components/Vue.set** in the codebase.

### Nuxt 3 breaking features
- `nuxt.config.js` → `nuxt.config.ts`: `publicRuntimeConfig`→`runtimeConfig.public`,
  `serverMiddleware`→Nitro `server/`, `render.csp`→server middleware, `head()`→`app.head`/`useHead`,
  `build.extend`→Vite/nitro config, `router.extendRoutes`→`app/router.options.ts`.
- Data fetching: **12 `asyncData` + 7 `fetch()` + 1 `nuxtServerInit`** → `useAsyncData`/`useFetch`.
- Plugins: 14 total, 5 use Nuxt2 `inject()` (`chain, eventBus, nftm, scot, sidechain`) →
  `defineNuxtPlugin` + `provide`.
- Middleware ×3, layouts ×2 → Nuxt 3 signatures (`navigateTo`, `useState`).
- `api/index.js` (Express serverMiddleware, 7 endpoints incl. cookie-session + csurf auth) →
  Nitro `server/api/*` (h3). Auth is a CUSTOM cookie strategy, NOT deep @nuxtjs/auth-next usage →
  replaceable with a light custom composable + the existing endpoints (simpler than it looks).

### Dependency replacement map
| Current (Vue2/Nuxt2) | Vue3/Nuxt3 path |
|---|---|
| bootstrap-vue | bootstrap-vue-next |
| @nuxtjs/auth-next | custom composable (endpoints already exist) |
| @nuxtjs/axios | drop module; use axios directly or `$fetch` |
| vuelidate 0.7 | @vuelidate/core |
| vue-notification | @kyvg/vue3-notification |
| vue-notification bus (`new Vue()`) | mitt |
| vue-lazyload | native `loading="lazy"` or vue3 build |
| vue-timeago | vue-timeago3 or small composable |
| vue-timers | composable (setInterval + onUnmounted) |
| mavon-editor | ⚠️ weak Vue3 support — RISK, may need replacement (md-editor-v3) |
| vue-plyr | vue-plyr Vue3 build / plyr direct |
| vue-pincode-input, vue-search-select, vue-backtotop | verify Vue3 build or replace (small) |
| @nuxtjs/{color-mode,fontawesome,router-extras,dotenv,eslint-module} | Nuxt3 equivalents / native |
| chart.js 2 + vue-chartjs 3 | chart.js 4 + vue-chartjs 5 |

## Phased plan
- **P0** Scaffold: Nuxt 3 `package.json` + `nuxt.config.ts`, dir layout, build green with an empty page.
- **P1** Core infra: runtimeConfig, plugins→defineNuxtPlugin, mitt bus, Pinia stores, auth composable.
- **P2** Server: `api/index.js` Express → Nitro `server/api/*` (login/me/logout/search/curated/csp).
- **P3** UI: bootstrap-vue-next swap + `$bvModal`→composable; fix `.sync`, filters, per-component diffs.
- **P4** Pages/data: `asyncData`/`fetch`→`useAsyncData`/`useFetch`; middleware; layouts.
- **P5** Libs: vuelidate/notification/editor/plyr/timeago/chart swaps.
- **P6** Harden: CSP, SSR parity check, full click-through on staging, fix hydration.
- **P7** Promote: merge `migration/nuxt3`→`dev`→`bbhproject`, rebuild prod.

## Open strategic decision (blocks P0)
Direct-to-Nuxt3 vs Nuxt Bridge intermediate; Pinia vs Vuex4. See chat.
