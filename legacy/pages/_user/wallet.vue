<template>
  <div class="user-wallet">
    <b-container fluid="lg">
      <template v-if="loading">
        <loading />
      </template>

      <template v-else>
        <b-card v-if="pendingRewards > 0" class="mt-3">
          <div class="d-flex align-items-center justify-content-between">
            Your current rewards: {{ pendingRewards }} {{ $config.TOKEN }}

            <b-button variant="info" :disabled="disableRedeem" @click.prevent="disableRedeem = true; requestRedeemRewards()">
              Redeem
            </b-button>
          </div>
        </b-card>

        <b-card class="mt-3">
          <b-row no-gutters>
            <b-col cols="8">
              <h6>{{ $config.TOKEN }}</h6>

              <div class="text-muted">
                Tradeable tokens that may be transferred anywhere at anytime.<br>
                {{ $config.TOKEN }} can be converted to {{ $config.TOKEN }} POWER in a process called staking.
              </div>
            </b-col>

            <b-col cols="4" class="text-right">
              <b-dropdown variant="link" right :disabled="disableDropdown" :no-caret="disableDropdown">
                <template #button-content>
                  <div class="h6 d-inline">
                    {{ numberWithCommas(tokenBalance) }} {{ $config.TOKEN }}
                  </div>
                </template>

                <b-dropdown-item-btn @click.prevent="showModal('transfer')">
                  Transfer
                </b-dropdown-item-btn>
                <b-dropdown-item-btn @click.prevent="showModal('stake')">
                  Stake
                </b-dropdown-item-btn>
                <b-dropdown-item target="_blank" :href="getMarketLink">
                  Market
                </b-dropdown-item>
              </b-dropdown>
            </b-col>
          </b-row>
        </b-card>

        <b-card class="mt-3">
          <b-row no-gutters>
            <b-col cols="8">
              <h6>{{ $config.TOKEN }} Power</h6>

              <div class="text-muted">
                Influence tokens which give you more control over post payouts and allow you to earn curation rewards.
              </div>
            </b-col>

            <b-col cols="4" class="text-right">
              <b-dropdown variant="link" right :disabled="disableDropdown" :no-caret="disableDropdown">
                <template #button-content>
                  <div class="h6 d-inline">
                    {{ numberWithCommas(tokenStake) }} {{ $config.TOKEN }}
                  </div>
                </template>

                <b-dropdown-item-btn @click.prevent="showModal('delegate')">
                  Delegate
                </b-dropdown-item-btn>
                <b-dropdown-item-btn @click.prevent="showModal('unstake')">
                  Unstake
                </b-dropdown-item-btn>
              </b-dropdown>

              <div v-if="tokenNetDelegation !== 0" class="h6 px-3">
                {{ tokenNetDelegation > 0 ? `+${numberWithCommas(tokenNetDelegation)}` : numberWithCommas(tokenNetDelegation) }} {{ $config.TOKEN }} <a v-if="tokenDelegations.length > 0" class="small" href="#" @click.prevent="$bvModal.show('delegationsModal')">
                  <fa-icon icon="eye" />
                </a>
              </div>
            </b-col>
          </b-row>
        </b-card>

        <b-card class="mt-3">
          <b-row no-gutters>
            <b-col cols="8">
              <h6>{{ currency }}</h6>

              <div class="text-muted">
                Tradeable tokens that may be transferred anywhere at anytime.<br>
                {{ currency }} can be converted to {{ currency }} POWER in a process called staking.
              </div>
            </b-col>

            <b-col cols="4" class="text-right">
              <b-dropdown variant="link" right :disabled="disableDropdown" :no-caret="disableDropdown">
                <template #button-content>
                  <div class="h6 d-inline">
                    {{ numberWithCommas(balance) }}  {{ currency }}
                  </div>
                </template>

                <b-dropdown-item target="_blank" :href="getWalletLink">
                  Wallet
                </b-dropdown-item>
              </b-dropdown>
            </b-col>
          </b-row>
        </b-card>

        <b-card class="mt-3">
          <b-row no-gutters>
            <b-col cols="8">
              <h6>{{ $config.IS_HIVE ? 'HIVE Power' : 'STEEM Power' }}</h6>

              <div class="text-muted">
                Influence tokens which give you more control over post payouts and allow you to earn curation rewards.
              </div>
            </b-col>

            <b-col cols="4" class="text-right">
              <b-dropdown variant="link" right :disabled="disableDropdown" :no-caret="disableDropdown">
                <template #button-content>
                  <div class="h6 d-inline">
                    {{ numberWithCommas(vestingHive) }} {{ currency }}
                  </div>
                </template>

                <b-dropdown-item target="_blank" :href="getWalletLink">
                  Wallet
                </b-dropdown-item>
              </b-dropdown>

              <div v-if="netDelegation !== 0" class="h6 px-3">
                {{ netDelegation > 0 ? `+${numberWithCommas(netDelegation)}` : numberWithCommas(netDelegation) }} {{ currency }}
              </div>
            </b-col>
          </b-row>
        </b-card>

        <b-card class="mt-3">
          <b-row no-gutters>
            <b-col cols="8">
              <h6>{{ $config.IS_HIVE ? 'HIVE Dollar' : 'STEEM Dollar' }}</h6>

              <div class="text-muted">
                Tradeable tokens that may be transferred anywhere at anytime.
              </div>
            </b-col>

            <b-col cols="4" class="text-right">
              <b-dropdown variant="link" right :disabled="disableDropdown" :no-caret="disableDropdown">
                <template #button-content>
                  <div class="h6 d-inline">
                    ${{ numberWithCommas(hbd_balance) }}
                  </div>
                </template>

                <b-dropdown-item target="_blank" :href="getWalletLink">
                  Wallet
                </b-dropdown-item>
              </b-dropdown>
            </b-col>
          </b-row>
        </b-card>

        <h4 class="mt-5">
          History
        </h4>

        <b-table
          striped
          responsive
          :fields="historyTableFields"
          :items="history"
          fixed
          sort-by="timestamp"
          :sort-desc="true"
          show-empty
          empty-text="There are no history to show"
        >
          <template #table-colgroup="scope">
            <col v-for="field in scope.fields" :key="field.key" :style="{ width: field.key === 'timestamp' ? '80px' : '200px' }">
          </template>

          <template #cell(timestamp)="{item}">
            <timeago :datetime="item.timestamp" :auto-update="60" />
          </template>

          <template #cell(description)="{item}">
            <template v-if="item.type === 'author_reward'">
              Author reward: {{ item.data.amount }} {{ item.data.token }} for <nuxt-link :to="{name:'user-post', params:{user:item.data.author,post:item.data.permlink}}">
                {{ item.data.author }}/{{ item.data.permlink }}
              </nuxt-link>
            </template>

            <template v-else-if="item.type === 'curation_reward'">
              Curation reward: {{ item.data.amount }} {{ item.data.token }} for <nuxt-link :to="{name:'user-post', params:{user:item.data.author,post:item.data.permlink}}">
                {{ item.data.author }}/{{ item.data.permlink }}
              </nuxt-link>
            </template>

            <template v-else-if="item.type === 'comment_benefactor_reward'">
              Benefactor reward: {{ item.data.amount }} {{ item.data.token }} for <nuxt-link :to="{name:'user-post', params:{user:item.data.author,post:item.data.permlink}}">
                {{ item.data.author }}/{{ item.data.permlink }}
              </nuxt-link>
            </template>

            <template v-else-if="item.type === 'staking_reward'">
              Staking reward: {{ item.data.amount }} {{ item.data.token }}
              </nuxt-link>
            </template>

            <template v-else-if="item.type === 'tokens_transfer'">
              <template v-if="item.data.from === $route.params.user">
                Transferred {{ item.data.amount }} {{ item.data.token }} to <nuxt-link :to="{name:'user', params:{user: item.data.to}}">
                  {{ item.data.to }}
                </nuxt-link>
              </template>

              <template v-else>
                Received {{ item.data.amount }} {{ item.data.token }} from <nuxt-link :to="{name:'user', params:{user: item.data.from}}">
                  {{ item.data.from }}
                </nuxt-link>
              </template>
            </template>

            <template v-else-if="item.type === 'tokens_stake'">
              <template v-if="item.data.from === $route.params.user">
                Staked {{ item.data.amount }} {{ item.data.token }} to <nuxt-link :to="{name:'user', params:{user: item.data.to}}">
                  {{ item.data.to }}
                </nuxt-link>
              </template>

              <template v-else>
                Received stake of {{ item.data.amount }} {{ item.data.token }} from <nuxt-link :to="{name:'user', params:{user: item.data.from}}">
                  {{ item.data.from }}
                </nuxt-link>
              </template>
            </template>

            <template v-else-if="item.type === 'tokens_delegate'">
              <template v-if="item.data.from === $route.params.user">
                Delegated {{ item.data.amount }} {{ item.data.token }} to <nuxt-link :to="{name:'user', params:{user: item.data.to}}">
                  {{ item.data.to }}
                </nuxt-link>
              </template>

              <template v-else>
                Received delegation of {{ item.data.amount }} {{ item.data.token }} from <nuxt-link :to="{name:'user', params:{user: item.data.from}}">
                  {{ item.data.from }}
                </nuxt-link>
              </template>
            </template>

            <template v-else-if="item.type === 'tokens_unstakeStart'">
              Started unstake of {{ item.data.amount }} {{ item.data.token }}
            </template>

            <template v-else-if="item.type === 'tokens_unstakeDone'">
              Completed unstake of {{ item.data.amount }} {{ item.data.token }}
            </template>

            <template v-else-if="item.type === 'tokens_cancelUnstake'">
              Cancelled unstaked on {{ item.data.amount }} {{ item.data.token }}
            </template>

            <template v-else-if="item.type === 'tokens_undelegateStart'">
              <template v-if="item.data.to === $route.params.user">
                Started undelegation of {{ item.data.amount }} {{ item.data.token }} from <nuxt-link :to="{name:'user', params:{user: item.data.from}}">
                  {{ item.data.from }}
                </nuxt-link>
              </template>

              <template v-else>
                <nuxt-link :to="{name:'user', params:{user: item.data.to}}">
                  {{ item.data.to }}
                </nuxt-link> undelegated {{ item.data.amount }} {{ item.data.token }}
              </template>
            </template>

            <template v-else-if="item.type === 'tokens_undelegateDone'">
              Completed undelegation of {{ item.data.amount }} {{ item.data.token }}
            </template>

            <template v-else>
              {{ item.raw_data }}
            </template>
          </template>

          <template #cell(data)="{item}">
            {{ item.data.memo }}
          </template>
        </b-table>
      </template>
    </b-container>

    <b-modal id="actionModal" centered :title="modalTitle">
      <b-form-group label="Available">
        <b-input-group>
          <b-form-input :value="available" readonly />

          <template #append>
            <b-button variant="info" @click="amountActive = true; amount = available">
              Max
            </b-button>
          </template>
        </b-input-group>
      </b-form-group>

      <b-form-group label="Amount">
        <b-form-input v-model="amount" number @input="amountActive = true; percentageActive = false" @change="amountActive = true; percentageActive = false" />
      </b-form-group>

      <b-row>
        <b-col cols="9" md="10">
          <b-form-input
            v-model="percentage"
            type="range"
            min="1"
            max="100"
            @input="amountActive = false; percentageActive = true"
            @change="amountActive = false; percentageActive = true"
          />
        </b-col>

        <b-col cols="3" md="2" class="text-right font-weight-bold">
          {{ percentage }}%
        </b-col>
      </b-row>

      <template v-if="['transfer', 'stake', 'delegate'].includes(action)">
        <b-form-group label="To">
          <b-input-group prepend="@">
            <b-form-input v-model="to" trim @input="to = $event.toLowerCase()" />
          </b-input-group>
        </b-form-group>
      </template>

      <b-form-group v-if="action === 'transfer'" label="Memo">
        <b-form-input v-model="memo" trim />
      </b-form-group>

      <template #modal-footer>
        <b-button :disabled="disableAction" variant="primary" @click="requestTokenAction({action, amount, to, memo})">
          <b-spinner v-if="waiting" small />
          <template v-else>
            {{ actionNames[action] }}
          </template>
        </b-button>
      </template>
    </b-modal>

    <b-modal id="delegationsModal" centered size="lg" title="Delegations" hide-footer>
      <b-table :items="tokenDelegations" hover sort-by="updated" sort-desc>
        <template #cell(created)="{item}">
          <timeago :datetime="item.created" :title="item.created.toLocaleString()" />
        </template>

        <template #cell(updated)="{item}">
          <timeago :datetime="item.updated" :title="item.updated.toLocaleString()" />
        </template>
      </b-table>
    </b-modal>
  </div>
</template>

<script>
import { mapGetters, mapActions } from 'vuex'
import { numberWithCommas, toFixedWithoutRounding } from '@/utils'

export default {
  name: 'Wallet',

  data () {
    return {
      balance: 0,
      hbd_balance: 0,
      vestingHive: 0,
      netDelegation: 0,

      tokenBalance: 0,
      tokenStake: 0,
      availableStake: 0,
      tokenNetDelegation: 0,
      tokenDelegations: [],

      pendingRewards: 0,

      action: '',
      available: 0,
      amount: 0,
      percentage: 0,
      to: '',
      memo: '',

      amountActive: false,
      percentageActive: false,
      waiting: false,
      disableRedeem: false,

      history: [],
      historyTableFields: [
        { key: 'timestamp', label: '' },
        { key: 'description', label: '' },
        { key: 'data', label: '' }
      ]
    }
  },

  async fetch () {
    this.loading = true

    const requests = [
      this.fetchChainBalance(),
      this.fetchSidechainBalance(),
      this.fetchAccountHistory()
    ]

    if (this.$auth.loggedIn && this.$route.params.user === this.$auth.user.username) {
      requests.push(this.fetchPendingRewards())
    }

    await Promise.all(requests)

    this.loading = false
  },

  head () {
    return {
      title: 'Wallet of'
    }
  },

  computed: {
    ...mapGetters(['tribe_info']),

    getMarketLink () {
      const { IS_HIVE, TOKEN } = this.$config

      return IS_HIVE ? `https://tribaldex.com/trade/${TOKEN}` : `https://steem-engine.net/?p=market&t=${TOKEN}`
    },

    getWalletLink () {
      return `${this.$config.IS_HIVE ? 'https://wallet.hive.blog' : 'https://steemitwallet.com'}/@${this.$route.params.user}/transfers`
    },

    currency () {
      return this.$config.IS_HIVE ? 'HIVE' : 'STEEM'
    },

    disableDropdown () {
      return !this.$auth.loggedIn || this.$auth.user.username !== this.$route.params.user
    },

    actionNames () {
      return {
        transfer: 'Transfer',
        stake: 'Stake',
        unstake: 'Unstake',
        delegate: 'Delegate'
      }
    },

    modalTitle () {
      return `${this.actionNames[this.action]} ${this.$config.TOKEN}`
    },

    disableAction () {
      return this.waiting || this.amount === 0 || this.amount > this.available || (['transfer', 'stake', 'delegate'].includes(this.action) && !/^([a-z])[a-z0-9-.]{2,15}$/.test(this.to))
    }
  },

  watch: {
    percentage (pct) {
      if (!this.percentageActive) {
        return
      }

      this.amount = toFixedWithoutRounding((this.available * (pct / 100)), this.tribe_info.precision)
    },

    amount (amount) {
      if (!this.amountActive) {
        return
      }

      this.percentage = Math.round((amount / this.available) * 100)
    }
  },

  mounted () {
    const self = this

    this.$root.$on('bv::modal::hidden', (_, modalId) => {
      if (modalId === 'actionModal') {
        self.available = 0
        self.amount = 0
        self.percentage = 0
        self.to = ''
        self.memo = ''
      }
    })

    this.$eventBus.$on(['tokens-transfer-successful', 'tokens-stake-successful', 'tokens-unstake-successful', 'tokens-delegate-successful'], async (data) => {
      self.waiting = true

      await self.validateTransaction(data.id)
    })

    this.$eventBus.$on('redeem-rewards-successful', async () => {
      await self.sleep(30 * 1000)

      await Promise.all([
        self.fetchSidechainBalance(),
        self.fetchPendingRewards(),
        self.fetchAccountHistory()
      ])
    })

    this.$eventBus.$on('transaction-validated', async () => {
      self.waiting = false

      self.$bvModal.hide('actionModal')

      await Promise.all([
        self.fetchSidechainBalance(),
        self.fetchAccountHistory()
      ])
    })

    this.$eventBus.$on('transaction-broadcast-error', () => {
      this.disableRedeem = false
    })
  },

  beforeDestroy () {
    this.$root.$off('bv::modal::hidden')

    this.$eventBus.$off(['tokens-transfer-successful', 'tokens-stake-successful', 'tokens-unstake-successful', 'tokens-delegate-successful', 'redeem-rewards-successful', 'transaction-validated', 'transaction-broadcast-error'])
  },

  methods: {
    ...mapActions('user', ['requestTokenAction', 'requestRedeemRewards']),
    ...mapActions('transaction', ['validateTransaction']),

    numberWithCommas,

    toFixedWithoutRounding,

    async fetchChainBalance () {
      const client = this.$chain.getClient()
      const { IS_HIVE } = this.$config
      const { user } = this.$route.params

      const [gProps, [account]] = await Promise.all([
        client.database.getDynamicGlobalProperties(),
        client.database.getAccounts([user])
      ])

      const totalVests = parseFloat(gProps.total_vesting_shares.split(' ')[0])
      const totalVestHive = parseFloat(gProps[IS_HIVE ? 'total_vesting_fund_hive' : 'total_vesting_fund_steem'].split(' ')[0])

      const vests = parseFloat(account.vesting_shares.split(' ')[0])
      const receivedVests = parseFloat(account.received_vesting_shares.split(' ')[0])
      const delegatedVests = parseFloat(account.delegated_vesting_shares.split(' ')[0])

      const vestingHive = (totalVestHive * (vests / totalVests))
      const received = totalVestHive * (receivedVests / totalVests)
      const delegated = totalVestHive * (delegatedVests / totalVests)

      const netDelegation = (received - delegated)

      this.vestingHive = toFixedWithoutRounding(vestingHive, 3)
      this.netDelegation = toFixedWithoutRounding(netDelegation, 3)
      this.balance = parseFloat(account.balance)
      this.hbd_balance = parseFloat(account[IS_HIVE ? 'hbd_balance' : 'sbd_balance'])
    },

    async fetchSidechainBalance () {
      const { user } = this.$route.params

      const [sidechainBalance, pendingUnstakes, tokenDelegations] = await Promise.all([
        this.$sidechain.getBalance(user, this.$config.TOKEN),
        this.$sidechain.getPendingUnstakes(user, this.$config.TOKEN),
        this.$sidechain.getDelegations({ symbol: this.$config.TOKEN, $or: [{ from: user }, { to: user }] })
      ])

      if (sidechainBalance) {
        this.tokenBalance = Number(sidechainBalance.balance)
        this.tokenStake = Number(sidechainBalance.stake)

        const tokenDelegationsIn = Number(sidechainBalance.delegationsIn)

        const tokenDelegationsOut = Number(sidechainBalance.delegationsOut)

        this.tokenNetDelegation = tokenDelegationsIn - tokenDelegationsOut

        const lockedStake = pendingUnstakes.filter(p => p.numberTransactionsLeft > 1)
          .reduce((acc, cur) => {
            return acc + toFixedWithoutRounding(Number(cur.quantityLeft) - (Number(cur.quantity) / this.$config.NUMBER_OF_UNSTAKE_TRX), this.tribe_info.precision)
          }, 0)

        this.availableStake = this.tokenStake - lockedStake
      }

      this.tokenDelegations = tokenDelegations.map((d) => {
        const { from, to, quantity, symbol, created, updated } = d

        return {
          from, to, quantity: `${Number(quantity)} ${symbol}`, created: new Date(created), updated: new Date(updated)
        }
      })
    },

    async fetchPendingRewards () {
      try {
        const data = await this.$scot.$get(`@${this.$route.params.user}`)

        const scotData = data[`${this.$config.TOKEN}`]

        if (scotData) {
          this.pendingRewards = toFixedWithoutRounding(scotData.pending_token / 10 ** scotData.precision, scotData.precision)
        }
      } catch (e) {
        console.log(e.message)
      }
    },

    async fetchAccountHistory () {
      const { user: account } = this.$route.params

      const [accountHistory, scotHistory] = await Promise.all([
        this.$axios.$get(`${this.$config.SIDECHAIN_HISTORY_API}/accountHistory`, {
          params: {
            account,
            limit: 50,
            ops: 'tokens_transfer,tokens_stake,tokens_delegate,tokens_unstakeStart,tokens_unstakeDone,tokens_cancelUnstake,tokens_undelegateStart,tokens_undelegateDone',
            symbol: this.$config.TOKEN
          }
        }),
        this.$scot.$get('get_account_history', { params: { account, limit: 50 } })
      ])

      const history = [...accountHistory, ...scotHistory]
        .map(h => ({ ...h, timestamp: Number.isInteger(h.timestamp) ? h.timestamp * 1000 : new Date(`${h.timestamp}Z`).getTime(), is_scot: !(h.operation) }))
        .map((h) => {
          let data = {}

          if (h.is_scot) {
            data = {
              author: h.author,
              permlink: h.permlink,
              amount: h.quantity,
              token: h.token
            }
          } else {
            data = {
              from: h.from,
              to: h.to,
              amount: Number(h.quantity || h.quantityReturned || h.quantityTokens),
              memo: h.memo,
              token: h.symbol
            }
          }

          return {
            timestamp: h.timestamp,
            type: h.type || h.operation,
            is_scot: h.is_scot,
            data,
            raw_data: h
          }
        })

      this.history = history
    },

    showModal (action) {
      this.action = action

      this.available = ['delegate', 'unstake'].includes(action) ? this.availableStake : this.tokenBalance

      if (this.action === 'stake') {
        this.to = this.$auth.user.username
      }

      this.$bvModal.show('actionModal')
    }
  }
}
</script>

<style scoped>
.btn::disabled {
  opacity: 1;
}
</style>
