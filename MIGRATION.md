# Nuxt 2 / Vue 2 → Nuxt 3 / Vue 3 migration

Branch: `migration/nuxt3` (off `dev`). Worked/tested on dev.thebbhproject.com staging.
Status: **P5 core DONE — all core routes 200. NEXT SESSION: P6** — SSR/hydration parity pass (click-through on staging, real Keychain login test), CSP, then deferred NFT/DTF/pool surfaces (disabled in BBH). Optional polish: lenient HTML parser, plyr, cosmetic dup-import warnings. Cadence: one phase per session.

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

## P1 notes (core infra — done)
- Plugins ported to defineNuxtPlugin: $eventBus (mitt + Vue2-style $on/$off/$emit adapter,
  array-of-events support), $chain, $sidechain, $scot, $api (replaces @nuxtjs/axios; APP_DOMAIN
  base + credentials + X-CSRF-Token from 'csrf-token' cookie — cookie is issued by P2 server),
  $nftm. All with cleanError SSR guard. $scot/$api/$nftm expose $get/$post sugar.
- Auth: stores/auth.js mirrors @nuxtjs/auth-next surface (loggedIn/user/login({data})/logout/
  fetchUser) against /api/v1 endpoints; composables/useAuth.js gives the $auth object shape.
- 9 Vuex modules → Pinia (options API; mutations kept as same-name actions so commit('SET_X')
  ports as this.SET_X()). store/index.js → stores/tribe.js.
- Verified E2E: SSR page fetches real tribe info/config from SCOT API through the new stack.
- Conversion flags to remember:
  * TODO(P3) modal wiring: tribe.showConfirmation + smartlock/broadcast-confirm paths currently
    AUTO-CONFIRM (emit show-modal then proceed); showUnlockModal AUTO-CANCELS. Must be wired to
    real modals in P3 — until then confirmation UX is bypassed. showNotification → $eventBus 'notify'.
  * Mirror getters dropped (Pinia forbids getter==state name); computed getters kept.
  * nftmarketplace: state token_price → token_price_raw (getter token_price keeps legacy semantics).
  * tribe.js commitMutation() helper resolves Vuex mutation-path strings ('user/UPDATE_FOLLOWING',
    'nftmarketplace/EMPTY_CART') from broadcast payloads to Pinia store actions.
  * Buffer imported explicitly in stores/user.js (Vite has no global polyfill); triplesec is CJS →
    default-import + destructure in utils/triplesec.js.
  * utils/ barrel is PARTIAL (4 pure helpers); markdown/HtmlReady/allTags land in P4. web-crypto +
    triplesec ported (auto-import name-collision WARN encrypt/decrypt is expected + harmless).
  * auth.setUser equivalent: direct authStore.user assignment in user store processLogin.

## P2 notes (server layer — done)
- Express api/index.js → Nitro server/api/v1/*: index.get (health), login.post (Hive sig
  verification, ported faithfully incl. legacy response-shape quirks: stale-ts → 200 {message},
  exception → 200 {error}, bad sig → 401), me.post, logout.post, search.post (HiveSearcher),
  curated.get (vote-history feed), csp-violation.post.
- Session: h3 useSession (sealed cookie, name 'session', 90d, secure+lax) via
  server/utils/session.js — replaces cookie-session. Secret: runtimeConfig.sessionSecret
  (SESSION_SECRET from .env at build; NUXT_SESSION_SECRET overrides at runtime).
- CSRF: server/middleware/csrf.js double-submit cookie ('csrf-token', non-httpOnly) checked
  against X-CSRF-Token header on POST login/logout only (mirrors legacy csurf scope). P1 $api
  plugin already sends the header.
- plugins/auth-init.client.js restores session on app load (replaces auth-next auto-fetch).
- Verified live: all 7 endpoints curl-tested incl. 403-without-CSRF, 401-without-session,
  legacy error shapes, and a real chain read (dhive getAccounts + getAccountHistory).
- NOT yet tested: a real Keychain login round-trip (needs browser + UI → P3/P6).

## P3 notes (UI foundation — done)
- bootstrap-vue-next 0.45 via @bootstrap-vue-next/nuxt module (manual createBootstrap plugin did NOT register components → empty SSR; the module handles registration/directives/auto-import). Bootstrap 5.3 SCSS compiled through app.scss (webpack ~ prefixes removed; bootstrap-vue Vue2 scss dropped).
- Modal system: stores/ui.js (modals registry + promise confirm/alert), components/app/ConfirmDialog.vue (global, in layout), plugins/modal-bridge.client.js (event-bus show-modal/hide-modal → registry). P1 AUTO-CONFIRM DEBT FIXED: tribe.showConfirmation + both broadcast confirms now use real dialogs. showUnlockModal still auto-cancels (SmartLock modal ports in P4).
- Notifications: @kyvg/vue3-notification ( + <notifications> in layout + event-bus notify bridge). FontAwesome via plugin (same 46-icon set, <fa-icon> name kept).
- Ported reference components: layouts/default.vue, Header.vue (BS4→BS5 classes; stray <style> inside legacy template removed), SidebarMenu.vue (BSidebar→BOffcanvas), modals/Login.vue (vuelidate v2; SmartLock button stubbed w/ notify), app/BackToTop.vue (replaces vue-backtotop), app/ConfirmDialog.vue.
- Route-name stub pages reserve legacy names: sort, publish, dashboard, user, user-feed, user-comments, user-replies, user-wallet, user-settings (definePageMeta name overrides; real pages in P4).
- static/ → public/ (git mv). color-mode via @nuxtjs/color-mode (Nuxt3 native), preference light.
- npm: overrides @vue/composition-api→vue ^3 (vuelidate optional peer). Blanket legacy-peer-deps BREAKS vite hoisting — do not use.
- Verified: build green; SSR renders navbar (nav links, logo, login/signup items), offcanvas sidebar, inlined BS5+app css; named route sort→/trending resolves; live tribe data still flows.
- CONVERSION.md written — the mechanical rulebook for the P4 mass port.

## P4 notes (mass port — core browsable)
- 4 parallel agent batches (content-utils, display components, interactive+SmartLock, pages+middleware). Batch B (display) died on a Fable-5 credits limit at its summary but had written all 8 files; finished/fixed inline.
- KEY integration fixes (systemic, unblocked everything):
  1. components pathPrefix:false in nuxt.config — legacy uses filename tags (<post-summary>), Nuxt3 default dir-prefixes (CardsPostSummary) → tags rendered as empty unresolved elements. THE big one.
  2. services-bridge.js pinia plugin attaches markRaw() to every store; stores use this. instead of useNuxtApp() (which throws "instance unavailable" after await during SSR). event-bus.client→event-bus (universal so  exists in SSR).
  3. tribe-init.js plugin runs tribe.init() globally (replaces nuxtServerInit) → tribe_config populated app-wide.
  4. pages:extend hook assigns legacy route names by file path (definePageMeta name doesn't extract from Options <script>; @[user] folder auto-names with @). All {name:"user-post"} links now resolve.
  5. homepage rewritten to idiomatic useAsyncData-returns-data (external-ref pattern left arrays empty).
  6. HtmlReady catch now falls back to preprocessed HTML (was blanking) — @xmldom 0.9 strict-throws on sloppy Hive post HTML; rendering errors 0 now. TODO(P5): lenient parser.
  7. static/: [static].vue catch-all shadowed /:sort → replaced with explicit faq.vue/tos.vue + StaticContent.vue.
- Verified 200: /, /trending, /created, post, profile, /comments /replies /followers /following /feed, /faq /tos, /dashboard, /login — all with REAL Hive data + working links/titles. Auth redirects (settings, publish → 302) correct. 404 correct.
- KNOWN 500s (P5): /hot (sort→endpoint shape), /@user/wallet (SSR auth.user null guard). Deferred (disabled in BBH config, not ported): NFT/DTF/pool pages+components, dao/dashboard modals, SignUp. SmartLock ported but pincode UI is a basic input (TODO P5). Mavon uploadImages uses v2 internals (needs runtime check).

## P5 notes (500 fixes — all core routes green)
- /hot 500 (posts.map not a function): get_discussions_by_hot intermittently returns a non-array → added Array.isArray guard in stores/scot.js fetchPosts. Also root cause of the residual: PostSummary sort-tag link had undefined tag (post.parent_permlink empty on some hot posts) → "Missing required param tag" SSR throw → guarded with v-if="post.parent_permlink".
- /wallet 500 (sortByModelResolved.value?.filter is not a function): bootstrap-vue-next BTable sort-by expects an array, legacy passed string sort-by="timestamp"/sort-desc → removed those props (data is API-pre-sorted) on both wallet b-tables. Also made wallet load() client-only (import.meta.client) so dynamic chain balance reads don't block SSR.
- Census 200: /, /trending /hot /created /payout, post, profile, /comments /replies /followers /following /feed, /wallet, /faq /tos, /dashboard, /login. HtmlReady rendering-error fallback holding (0 blank bodies).
- Deferred/optional (P6+): lenient HTML parser to reduce @xmldom throw-rate (current fallback is adequate); vue-plyr replacement (only in deferred NFT/video surfaces); cosmetic build warnings (useColorMode dup from bvn+color-mode; encrypt/decrypt dup auto-import from triplesec+web-crypto — harmless, code uses explicit aliased imports).
