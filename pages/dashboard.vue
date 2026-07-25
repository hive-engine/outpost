<template>
  <div class="dashboard">
    <div class="dash-header">
      <h1 class="dash-title">Token Dashboard <sup>Beta</sup></h1>
      <p class="dash-sub">Inflation &amp; reward-pool management for ${{ appConfig.TOKEN }} — issuer only.</p>
    </div>

    <div class="dash-body">
      <loading v-if="loading" />

      <template v-else>
        <!-- supply cards -->
        <div class="stat-grid stat-grid-3">
          <div class="stat-card">
            <div class="stat-label">Max Supply</div>
            <div class="stat-value mono">{{ maxSupply.toLocaleString() }}</div>
            <div class="stat-unit">{{ appConfig.TOKEN }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Current Supply</div>
            <div class="stat-value mono">{{ supply.toLocaleString() }}</div>
            <div class="stat-unit">{{ appConfig.TOKEN }}</div>
          </div>
          <div class="stat-card accent">
            <div class="stat-label">Daily Emissions</div>
            <div class="stat-value mono">{{ Number(dailyEmissions).toLocaleString() }}</div>
            <div class="stat-unit">{{ appConfig.TOKEN }} / day</div>
          </div>
        </div>

        <!-- reward breakdown -->
        <div class="stat-grid stat-grid-4">
          <div v-for="r of rewardBreakdown" :key="r.key" class="stat-card mini">
            <div class="stat-label">{{ r.label }}</div>
            <div class="stat-value-sm mono">{{ r.value.toLocaleString() }}</div>
            <div class="stat-pct">
              <span class="pct-bar"><span class="pct-fill" :style="{ width: `${Math.min(pct(r.value), 100)}%` }" /></span>
              {{ pct(r.value) }}%
            </div>
          </div>
        </div>

        <p class="dash-note">* Rewards shown are estimated daily emissions.</p>

        <!-- Manage Inflations -->
        <section class="manage">
          <h2 class="manage-title">Manage Inflations</h2>

          <div class="manage-card">
            <div class="manage-card-head">
              <h3>Proof of Brain (PoB)</h3>
              <b-badge v-if="smtRewardPools.length" :variant="smtRewardPools[0].active ? 'success' : 'secondary'">
                {{ smtRewardPools[0].active ? 'Active' : 'Inactive' }}
              </b-badge>
            </div>
            <pob-rewards :scot="isSCOT" :pools="smtRewardPools" />
          </div>

          <div v-if="stakingRewardPools.length" class="manage-card">
            <div class="manage-card-head"><h3>Proof of Stake (PoS)</h3></div>
            <p class="text-muted mb-0">{{ stakingRewardPools.length }} mining pool(s). Manage on <a href="https://tribaldex.com" target="_blank" rel="noopener">Tribaldex</a>.</p>
          </div>

          <div v-if="lpRewardPools.length" class="manage-card">
            <div class="manage-card-head"><h3>Liquidity Providers (LP)</h3></div>
            <p class="text-muted mb-0">{{ lpRewardPools.length }} LP pool(s). Manage on <a href="https://tribaldex.com" target="_blank" rel="noopener">Tribaldex</a>.</p>
          </div>

          <p class="dash-note mt-3">
            PoS, LP and DAO inflation are not configured for ${{ appConfig.TOKEN }}. They can be added via
            <a href="https://tribaldex.com" target="_blank" rel="noopener">Tribaldex</a> if ever needed.
          </p>
        </section>
      </template>
    </div>
  </div>
</template>

<script>
// Ported from legacy/pages/dashboard.vue (issuer-only Token Dashboard).
// Vuex getters → Pinia (tribe issuer/info/config); $config → runtime config;
// asyncData/fetch → client-side load() (issuer-gated, chain reads); middleware
// 'issuer' → client guard in mounted (redirects non-issuers). BBH is a
// comments-SMT (PoB) tribe: PoB is the live section; PoS/LP/DAO are computed
// faithfully but empty (no pools/funds, DTF/POOL disabled in config).
// Route auto-named 'dashboard' from the filename (Header links resolve).
import { mapState } from 'pinia'
import { toFixedWithoutRounding } from '@/utils'
import Loading from '@/components/Loading.vue'
import PobRewards from '@/components/dashboard/PobRewards.vue'
import { useAuthStore } from '~/stores/auth'
import { useTribeStore } from '~/stores/tribe'

export default {
  name: 'Dashboard',

  components: { Loading, PobRewards },

  setup () {
    const { $sidechain } = useNuxtApp()
    return { appConfig: useRuntimeConfig().public, auth: useAuthStore(), $sidechain }
  },

  data () {
    return {
      loading: true,
      maxSupply: 0,
      supply: 0,
      pobRewards: 0,
      stakingRewards: 0,
      poolRewards: 0,
      daoPayments: 0,
      smtRewardPools: [],
      stakingRewardPools: [],
      lpRewardPools: []
    }
  },

  computed: {
    ...mapState(useTribeStore, ['tribe_info', 'tribe_config', 'issuer']),

    isSCOT () {
      return Boolean(this.tribe_info?.start_date)
    },

    precision () {
      return Number(this.tribe_info?.precision ?? 8)
    },

    dailyEmissions () {
      const total = this.pobRewards + this.stakingRewards + this.poolRewards + this.daoPayments
      return toFixedWithoutRounding(total, this.precision)
    },

    rewardBreakdown () {
      return [
        { key: 'pob', label: 'PoB Rewards', value: this.pobRewards },
        { key: 'pos', label: 'PoS Rewards', value: this.stakingRewards },
        { key: 'lp', label: 'LP Rewards', value: this.poolRewards },
        { key: 'dao', label: 'DAO Rewards', value: this.daoPayments }
      ]
    }
  },

  mounted () {
    // Issuer guard (client-side; auth + tribe issuer are resolved on the client).
    if (!this.auth.loggedIn || this.auth.user.username !== this.issuer) {
      return navigateTo('/')
    }

    this.load()

    this.$eventBus.$on(['smt-reward-pool-update-successful', 'smt-reward-pool-activation-successful'], this.onUpdated)
  },

  beforeUnmount () {
    this.$eventBus.$off(['smt-reward-pool-update-successful', 'smt-reward-pool-activation-successful'], this.onUpdated)
  },

  methods: {
    async onUpdated () {
      // give the sidechain a moment to index, then refresh
      this.loading = true
      await new Promise(r => setTimeout(r, 4000))
      await this.load()
    },

    async load () {
      this.loading = true

      try {
        const [tokens] = await Promise.all([
          this.$sidechain.getTokens({ symbol: this.appConfig.TOKEN }),
          this.calcPob(),
          this.calcMining()
        ])

        const token = Array.isArray(tokens) ? tokens[0] : tokens

        if (token) {
          this.maxSupply = Number(token.maxSupply)
          this.supply = Number(token.circulatingSupply ?? token.supply)
        }
      } catch (e) {
        this.$notify({ title: 'Error', type: 'error', text: e.message || 'Could not load token data.' })
      } finally {
        this.loading = false
      }
    },

    async calcPob () {
      try {
        this.smtRewardPools = []

        if (this.isSCOT) {
          const blocksInADay = 28800
          const scotRewardPerDay = (this.tribe_info.rewards_token / 10 ** this.precision) * (blocksInADay / this.tribe_config.rewards_token_every_n_block)
          this.pobRewards = toFixedWithoutRounding(scotRewardPerDay * this.tribe_config.pob_pool_percentage / 100, this.precision)
          return
        }

        const pool = await this.$sidechain.getSMTRewardPool(this.appConfig.TOKEN)

        if (pool) {
          this.smtRewardPools.push(pool)
          const { rewardIntervalSeconds, rewardPerInterval } = pool.config
          this.pobRewards = toFixedWithoutRounding(((24 * 60 * 60) / rewardIntervalSeconds) * Number(rewardPerInterval), this.precision)
        }
      } catch (e) {
        console.log(e.message)
      }
    },

    async calcMining () {
      try {
        const pools = await this.$sidechain.getMiningPools({ minedToken: this.appConfig.TOKEN })

        if (!Array.isArray(pools)) { return }

        const staking = pools.filter(m => !m.externalContract)
        this.stakingRewardPools = staking
        this.stakingRewards = staking.filter(p => p.active)
          .reduce((acc, cur) => acc + (Number(cur.lotteryAmount) * (24 / cur.lotteryIntervalHours)), 0)

        const lp = pools.filter(m => m.externalContract === 'marketpools')
        this.lpRewardPools = lp
        this.poolRewards = lp.filter(p => p.active)
          .reduce((acc, cur) => acc + (Number(cur.lotteryAmount) * (24 / cur.lotteryIntervalHours)), 0)
      } catch (e) {
        console.log(e.message)
      }
    },

    pct (value) {
      const total = Number(this.dailyEmissions)
      return total > 0 ? ((value / total) * 100).toFixed(2) : '0.00'
    }
  }
}
</script>

<style scoped>
.dashboard { max-width: 1080px; margin: 0 auto; padding: 0 clamp(.8rem, 3vw, 1.5rem) 4rem; }

.dash-header { padding: 1.8rem 0 1.4rem; }
.dash-title {
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 700;
  font-size: 2rem;
  margin: 0;
  background: linear-gradient(135deg, var(--w3-gold), #ffd34d);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
.dash-title sup { font-size: .5em; color: var(--w3-gold); -webkit-text-fill-color: var(--w3-gold); }
.dash-sub { color: var(--w3-muted); margin: .3rem 0 0; }

.stat-grid { display: grid; gap: 1rem; margin-bottom: 1rem; }
.stat-grid-3 { grid-template-columns: repeat(3, 1fr); }
.stat-grid-4 { grid-template-columns: repeat(4, 1fr); }
@media (max-width: 720px) {
  .stat-grid-3, .stat-grid-4 { grid-template-columns: repeat(2, 1fr); }
}

.stat-card {
  background: var(--w3-panel);
  border: 1px solid var(--w3-border);
  border-radius: 16px;
  padding: 1.3rem;
  text-align: center;
  backdrop-filter: blur(10px);
}
.stat-card.accent {
  background:
    radial-gradient(120% 120% at 50% 0%, rgba(245, 184, 0, .14), transparent 60%),
    var(--w3-panel);
  border-color: rgba(245, 184, 0, .3);
}
.stat-label { font-size: .74rem; text-transform: uppercase; letter-spacing: .05em; color: var(--w3-muted); font-weight: 700; }
.stat-value { font-size: 1.7rem; font-weight: 800; color: var(--w3-text); margin-top: .3rem; line-height: 1.1; }
.stat-value-sm { font-size: 1.25rem; font-weight: 800; color: var(--w3-text); margin-top: .3rem; }
.stat-unit { font-size: .72rem; color: var(--w3-muted); margin-top: .15rem; }
.stat-card.mini { padding: 1rem; }
.stat-pct { font-size: .78rem; color: var(--w3-muted); margin-top: .4rem; display: flex; align-items: center; gap: .5rem; justify-content: center; }
.pct-bar { flex: 1; max-width: 70px; height: 5px; border-radius: 3px; background: var(--w3-border); overflow: hidden; }
.pct-fill { display: block; height: 100%; background: linear-gradient(90deg, var(--w3-gold), #ffd34d); }

.dash-note { color: var(--w3-muted); font-size: .8rem; margin: .3rem 0 0; }

.manage { margin-top: 2.2rem; }
.manage-title {
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 700;
  font-size: 1.4rem;
  color: var(--w3-text);
  padding-bottom: .6rem;
  border-bottom: 1px solid var(--w3-border);
  margin-bottom: 1.2rem;
}
.manage-card {
  background: var(--w3-panel);
  border: 1px solid var(--w3-border);
  border-radius: 16px;
  padding: 1.3rem;
  margin-bottom: 1rem;
}
.manage-card-head { display: flex; align-items: center; gap: .7rem; margin-bottom: 1rem; }
.manage-card-head h3 { font-size: 1.1rem; font-weight: 700; margin: 0; color: var(--w3-text); }

.dash-table { color: var(--w3-text); margin: 0; }
.dash-table :deep(th) { color: var(--w3-muted); font-weight: 700; border-color: var(--w3-border); font-size: .82rem; text-transform: uppercase; letter-spacing: .03em; }
.dash-table :deep(td) { border-color: var(--w3-border); vertical-align: middle; }
</style>
