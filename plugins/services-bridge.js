// Attaches the Nuxt app to every Pinia store as `this.$nuxt`, so store actions can
// reach plugin services ($chain, $sidechain, $scot, $api, $nftm, $eventBus) WITHOUT
// calling useNuxtApp() — which throws "[nuxt] instance unavailable" when invoked after
// an await during SSR (async context is lost). markRaw keeps it out of reactivity.
// nuxtApp props are read lazily via getters, so ordering vs the service plugins doesn't
// matter — but this MUST register the pinia plugin BEFORE any store is instantiated.
// enforce:'pre' runs it before every normal plugin, incl. auth-init/tribe-init which
// instantiate stores at startup (otherwise those store instances never get $nuxt and
// their actions — e.g. login — silently fail on `const { $api } = this.$nuxt`).
export default defineNuxtPlugin({
  name: 'services-bridge',
  // NOT enforce:'pre' — that runs before @pinia/nuxt sets up nuxtApp.$pinia.
  // Instead, auth-init/tribe-init declare dependsOn:['services-bridge'] so they
  // (the plugins that instantiate stores at startup) run after this one.
  setup (nuxtApp) {
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
  }
})
