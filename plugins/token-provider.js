// Token-backend abstraction — provides `$token`.
//
// The Outpost's token features (wallet, reward pool, ticker, staking, vote
// values…) historically called Hive-Engine ($sidechain / SCOT) directly. This
// plugin puts a neutral `tokenProvider` interface in front of them so the same
// UI can run on Hive-Engine (SCOT, default) or Magi (VSC) — switched with the
// single TOKEN_BACKEND flag (config.js) and no component changes. Makes the
// Outpost reusable across tribes on either chain.
//
// Registers after sidechain.js (alphabetical plugin order) so $sidechain exists.
import { createHiveEngineProvider } from '~/utils/token/hive-engine'
// import { createMagiProvider } from '~/utils/token/magi' // added once tibfox's VSC API is known

export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig().public
  const backend = config.TOKEN_BACKEND || 'hive-engine'

  let provider
  switch (backend) {
    // case 'magi':
    //   provider = createMagiProvider({ config })
    //   break
    case 'hive-engine':
    default:
      provider = createHiveEngineProvider({ sidechain: nuxtApp.$sidechain })
      break
  }

  return { provide: { token: provider } }
})
