// Attaches the Nuxt app to every Pinia store as `this.$nuxt`, so store actions can
// reach plugin services ($chain, $sidechain, $scot, $api, $nftm, $eventBus) WITHOUT
// calling useNuxtApp() — which throws "[nuxt] instance unavailable" when invoked after
// an await during SSR (async context is lost). markRaw keeps it out of reactivity.
// nuxtApp props are read lazily via getters, so this plugin's order vs the service
// plugins doesn't matter — only that it runs before the first store is instantiated
// (filename sorts before tribe-init.js, the earliest store user).
export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.$pinia.use(() => ({
    $nuxt: markRaw({
      get $chain () { return nuxtApp.$chain },
      get $sidechain () { return nuxtApp.$sidechain },
      get $scot () { return nuxtApp.$scot },
      get $api () { return nuxtApp.$api },
      get $nftm () { return nuxtApp.$nftm },
      get $eventBus () { return nuxtApp.$eventBus }
    })
  }))
})
