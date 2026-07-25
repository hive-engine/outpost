# Component/page conversion conventions (Vue 2 → Vue 3)

Rules for porting `legacy/components/**` and `legacy/pages/**`. Derived from the P3
reference ports: `components/Header.vue`, `components/SidebarMenu.vue`,
`components/modals/Login.vue`, `layouts/default.vue`. Follow these mechanically.

## Script
- Options API is fine to keep, or use `<script setup>` (P3 ports use setup). Either way:
- `this.$config.X` → `const config = useRuntimeConfig().public` … `config.X`
- `this.$auth` → `useAuthStore()` (import `~/stores/auth`): `.loggedIn`, `.user.username`, `.logout()`
- Vuex `mapGetters/mapState/mapActions('module', [...])` → Pinia stores directly:
  `const userStore = useUserStore()` then `userStore.voting_power`, `userStore.fetchFollowers()`.
  Root-store getters (`issuer`, `muting_account`) live on `useTribeStore()`.
- `this.$eventBus.$on/$off/$emit` → unchanged (adapter provides Vue2-style API):
  `const { $eventBus } = useNuxtApp()`. `$root.$on(...)` → `$eventBus.$on(...)`.
- `this.$bvModal.show('x')/hide('x')` → `useUiStore().showModal('x')/hideModal('x')`
- `this.$bvModal.msgBoxConfirm(...)` → `useUiStore().confirm({ message, title, ... })` (Promise<boolean>)
- `this.$notify(...)` → unchanged (`const { $notify } = useNuxtApp()`)
- `this.$colorMode` → `useColorMode()`
- `this.$cookies.get/set/remove` → `useCookie(name).value` (get/assign/null)
- vuelidate: `import { validationMixin }… $v` → `useVuelidate` from `@vuelidate/core`,
  validators from `@vuelidate/validators`; template `$v.` → `v$.`
- Lifecycle: `beforeDestroy` → `beforeUnmount` (options) / `onBeforeUnmount` (setup);
  `destroyed` → `unmounted`
- `.sync` prop modifier → `v-model:propName`
- vue-timers `timers:` option → `setInterval` in `onMounted` + `clearInterval` in `onUnmounted`
- `window.hive_keychain` guards: wrap browser-only logic in `import.meta.client` or onMounted
- Filters `{{ x | f }}` → method/computed call `{{ f(x) }}`

## Template — BootstrapVue → bootstrap-vue-next
- Most `b-*` tags exist 1:1 (registered globally by @bootstrap-vue-next/nuxt).
- `<b-modal id="x">` → `<b-modal v-model="ui.modals.x">` (ui = useUiStore(); id attr optional)
- `<b-sidebar>` → `<b-offcanvas>` (`right` → `placement="end"`; bg/text-variant → utility classes)
- dropdown `right` → `end`
- `<b-button block>` → `class="w-100"`
- `<b-navbar type="light">` → drop `type`
- `v-b-toggle` / `v-b-tooltip` directives: unchanged (module registers them)
- `<b-nav-item-dropdown>`: keep; `#button-content` slot unchanged
- `<client-only>` unchanged; `<Nuxt/>`→`<slot/>` (layouts), `<NuxtLink>`/`:to` unchanged

## Template — Bootstrap 4 → 5 class renames
- `ml-*`/`mr-*` → `ms-*`/`me-*`; `pl-*`/`pr-*` → `ps-*`/`pe-*`
- `float-left/right` → `float-start/end`; `text-left/right` → `text-start/end`
- `font-weight-*` → `fw-*`; `font-italic` → `fst-italic`
- `badge-<variant>` → `text-bg-<variant>`; `badge-pill` → `rounded-pill`
- `custom-control`/`custom-checkbox` etc → `form-check` family
- `form-group` has no BS5 equivalent — keep class (styled by app.scss) or use `mb-3`
- `sr-only` → `visually-hidden`; `close` → `btn-close`
- `jumbotron`, `media` object: removed in BS5 — app.scss carries legacy styles; keep markup

## Pages (P4)
- `asyncData({ $x, route, error })` → `useAsyncData` in `<script setup>`;
  route via `useRoute()`, error via `createError`/`showError`,
  plugins via `useNuxtApp()`
- `fetch()` (component) → `useAsyncData`/`useLazyAsyncData` or `callOnce`
- `fetchOnServer: false` → `useAsyncData(..., { server: false })`
- Route names must match legacy names — set `definePageMeta({ name: '<legacy-name>' })`
  (P3 stubs in pages/ show the mapping; replace stub content, keep names)
- `validate()` → `definePageMeta({ validate })`
- `head()` → `useHead()` / `useSeoMeta()`
- `middleware: 'authenticated'` → `definePageMeta({ middleware: 'authenticated' })`
  (middleware files themselves are ported in P4)

## Gotchas learned in P3
- Assets live in `public/` (was `static/`)
- npm: `@vue/composition-api` override in package.json is required (vuelidate optional
  peer); do NOT use blanket legacy-peer-deps (it breaks vite hoisting)
- CJS packages: import default + destructure (see utils/triplesec.js)
- `Buffer` must be imported from 'buffer' explicitly (Vite has no global polyfill)
- SmartLock modal not yet ported (stubbed in Login.vue) — port with modals batch in P4
