<template>
  <b-modal id="manageMiningPoolModal" size="lg" title="Manage Mining Pool" centered>
    <template v-if="loading">
      <loading small />
    </template>

    <template v-else>
      <b-form-row>
        <b-col cols="12" lg="6">
          <b-form-group label="Pool ID" description="Pool ID of the pool you are updating.">
            <b-form-input :value="pool.id" readonly />
          </b-form-group>

          <b-form-group label="Lottery Amount" description="Amount of tokens to split among the lottery winners.">
            <b-form-input v-model="lotteryAmount" type="number" number :state="$v.lotteryAmount.$dirty ? !$v.lotteryAmount.$error : null" />
          </b-form-group>
        </b-col>

        <b-col cols="12" lg="6">
          <b-form-group label="Lottery Winners" description="Number of lottery winners per round. Must be between 1 and 20.">
            <b-form-input v-model="lotteryWinners" type="number" number :state="$v.lotteryWinners.$dirty ? !$v.lotteryWinners.$error : null" />
          </b-form-group>

          <b-form-group label="Lottery Interval" description="How often in hours to run a lottery. Must be between 1 and 720 hours.">
            <b-form-input v-model="lotteryIntervalHours" type="number" number :state="$v.lotteryIntervalHours.$dirty ? !$v.lotteryIntervalHours.$error : null" />
          </b-form-group>
        </b-col>
      </b-form-row>

      <div v-if="tokenMiners && tokenMiners.length >0">
        Token Miners

        <hr class="mt-1">

        <div v-for="(miner, i) in tokenMiners" :key="i">
          <b-form-row>
            <b-col sm="5">
              <b-form-group
                label="Token"
                label-sr-only
                description="Symbol of token that is mining."
              >
                <b-form-input :value="miner.symbol" disabled />
              </b-form-group>
            </b-col>

            <b-col sm="4">
              <b-form-group label="Multiplier" label-sr-only description="Multiplier for the mining token. Must be between 1 and 100.">
                <b-form-input
                  v-model="miner.multiplier"
                  number
                  type="number"
                  placeholder="Multiplier"
                  :state="$v.tokenMiners.$each.$iter[i].multiplier.$dirty ? !$v.tokenMiners.$each.$iter[i].multiplier.$error : null"
                />
              </b-form-group>
            </b-col>
          </b-form-row>
        </div>
      </div>

      <template v-if="nftTokenMiner">
        NFT Miner
        <hr class="mt-1">

        <b-form-row>
          <b-col cols="12" lg="6">
            <b-form-group label="NFT Symbol" description="Symbol of the NFT that will be mining. NFT must have delegation enabled.">
              <b-form-input readonly disabled :value="nftTokenMiner.symbol" /></b-form-input>
            </b-form-group>
          </b-col>

          <b-col cols="12" lg="6">
            <b-form-group label="NFT Property" description="Property of NFT to use to distinguish NFT types.">
              <b-form-input
                :value="nftTokenMiner.typeField"
                readonly
                disabled
              />
            </b-form-group>
          </b-col>
        </b-form-row>

        Properties For Power Computation

        <hr class="mt-1">

        <div v-for="(properties, i) in nftTokenMiner.properties" :key="i" class="border-bottom mb-2 pb-2">
          <b-form-row>
            <b-col lg="3">
              <b-form-group
                label="Operation"
                description="Whether to add or multiply the power values for this property."
              >
                <b-form-select
                  v-model="properties.op"
                  :options="propertyOperation"
                  :state="$v.nftTokenMiner.properties.$each.$iter[i].op.$dirty ? !$v.nftTokenMiner.properties.$each.$iter[i].op.$error : null"
                />
              </b-form-group>
            </b-col>

            <b-col lg="4">
              <b-form-group label="Name" description="Name of property.">
                <b-form-input
                  v-model="properties.name"
                  trim
                  placeholder="Name"
                  :state="$v.nftTokenMiner.properties.$each.$iter[i].name.$dirty ? !$v.nftTokenMiner.properties.$each.$iter[i].name.$error : null"
                />
              </b-form-group>
            </b-col>

            <b-col lg="5">
              <b-form-group label="Burn Change (Optional)" description="Configuration for authorized burn adjustments.">
                <b-form-row>
                  <b-col>
                    <b-form-group label="Quantity" label-sr-only>
                      <b-form-input
                        v-model="properties.burnChange.quantity"
                        number
                        :state="$v.nftTokenMiner.properties.$each.$iter[i].burnChange.quantity.$dirty ? !$v.nftTokenMiner.properties.$each.$iter[i].burnChange.quantity.$error : null"
                        placeholder="Quantity"
                      />
                    </b-form-group>
                  </b-col>

                  <b-col>
                    <b-form-group
                      label="Symbol"
                      label-sr-only
                      :state="$v.nftTokenMiner.properties.$each.$iter[i].burnChange.symbol.$dirty ? !$v.nftTokenMiner.properties.$each.$iter[i].burnChange.symbol.$error : null"
                      invalid-feedback="Please select a token"
                    >
                      <model-select
                        v-model="properties.burnChange.symbol"
                        :options="availableTokens"
                        placeholder="Select a token"
                      />
                    </b-form-group>
                  </b-col>
                </b-form-row>
              </b-form-group>
            </b-col>

            <b-col cols="12">
              <b-button v-show="i === nftTokenMiner.properties.length - 1" class="mt-1" size="sm" @click.prevent="addField('properties')">
                <fa-icon icon="plus" /> Add
              </b-button>

              <b-button v-show="i > 0" class="mt-1" size="sm" variant="danger" @click.prevent="removeField('properties', i)">
                <fa-icon icon="times" /> Remove
              </b-button>
            </b-col>
          </b-form-row>
        </div>

        Map Type to Power Attributes

        <hr class="mt-1">

        <b-form-row>
          <b-col cols="3">
            <b-form-input v-model="typeMap.type" placeholder="Type" :state="$v.typeMap.type.$dirty ? !$v.typeMap.type.$error : null" />
          </b-col>

          <b-col cols="8">
            <b-form-row>
              <b-col v-for="(prop, j) of nftTokenMiner.properties" :key="`prop-${j}`" cols="3">
                <b-form-input
                  v-model="typeMap.value[j]"
                  required
                  type="number"
                  number
                  :placeholder="prop.name || 'Value'"
                  :state="$v.typeMap.value.$dirty ? !$v.typeMap.value.$error : null"
                />
              </b-col>
            </b-form-row>
          </b-col>

          <b-col cols="1">
            <b-button size="sm" @click="addTypeMap">
              Add
            </b-button>
          </b-col>
        </b-form-row>

        <template v-if="Object.keys(nftTokenMiner.typeMap).length > 0">
          <div v-for="(type, k) of Object.keys(nftTokenMiner.typeMap)" :key="`typemap-${k}`" class="mt-2">
            <b-form-row>
              <b-col cols="3">
                <b-form-input :value="type" readonly />
              </b-col>

              <b-col cols="8">
                <b-form-row>
                  <b-col v-for="(value, j) of nftTokenMiner.typeMap[type]" :key="`value-${j}`" cols="3">
                    <b-form-input :value="value" readonly />
                  </b-col>
                </b-form-row>
              </b-col>

              <b-col cols="1">
                <b-button size="sm" variant="danger" @click="removeTypeMap(type)">
                  <fa-icon icon="times" />
                </b-button>
              </b-col>
            </b-form-row>
          </div>
        </template>

        <p v-else class="text-center mt-3 mb-0" :class="{'text-danger': $v.main.$error}">
          Please add type maps.
        </p>
      </template>

      <div class="text-info mt-3">
        <p>Mining pool update fee: {{ poolUpdateFee }} BEE</p>
        <p>Your current balance: {{ tokenBalance }} BEE</p>
      </div>
    </template>

    <template #modal-footer>
      <b-button variant="primary" :disabled="loading || modalBusy || poolUpdateFee > tokenBalance" @click.prevent="updateMiningPool">
        <b-spinner v-if="modalBusy" small /> Update
      </b-button>
    </template>
  </b-modal>
</template>

<script>
import Vue from 'vue'
import { mapGetters, mapActions } from 'vuex'
import { between, decimal, numeric, required, requiredIf } from 'vuelidate/lib/validators'
import { ModelSelect } from 'vue-search-select'

export default {
  name: 'ManageMiningModal',

  components: {
    ModelSelect
  },

  data () {
    return {
      lotteryWinners: '',
      lotteryIntervalHours: '',
      lotteryAmount: '',
      tokenMiners: [],
      nftTokenMiner: null,

      propertyOperation: ['ADD', 'MULTIPLY'],

      typeMap: {
        type: '',
        value: []
      },

      tokens: [],
      poolUpdateFee: 0,
      tokenBalance: 0,

      loading: true,
      modalBusy: false
    }
  },

  computed: {
    ...mapGetters('dashboard', ['pool']),

    availableTokens () {
      return this.tokens.map(t => ({ value: t.symbol, text: `${t.name} (${t.symbol})` }))
    }
  },

  mounted () {
    this.$root.$on('bv::modal::shown', this.onModalShown)
    this.$root.$on('bv::modal::hidden', this.onModalHidden)

    this.$eventBus.$on('transaction-broadcast-error', this.resetModalBusyState)
  },

  beforeDestroy () {
    this.$root.$off('bv::modal::shown', this.onModalShown)
    this.$root.$off('bv::modal::hidden', this.onModalHidden)

    this.$eventBus.$off('transaction-broadcast-error', this.resetModalBusyState)
  },

  methods: {
    ...mapActions(['requestBroadcastJson']),
    ...mapActions('dao', ['fetchTokens']),

    updateMiningPool () {
      this.$v.main.$touch()

      if (!this.$v.main.$invalid) {
        this.modalBusy = true

        const message = 'Update Mining Pool'
        const eventName = 'mining-pool-update-successful'

        const { lotteryWinners, lotteryIntervalHours, lotteryAmount, tokenMiners, nftTokenMiner } = this

        const json = {
          contractName: 'mining',
          contractAction: 'updatePool',
          contractPayload: {
            id: this.pool.id,
            lotteryWinners,
            lotteryIntervalHours,
            lotteryAmount: lotteryAmount.toString()
          }
        }

        json.contractPayload.tokenMiners = tokenMiners.filter(t => t.symbol && t.multiplier >= 1)

        if (nftTokenMiner) {
          const { symbol, typeField } = nftTokenMiner

          const properties = nftTokenMiner.properties.reduce((acc, cur) => {
            const data = {
              op: cur.op,
              name: cur.name
            }

            if (Number(cur.burnChange.quantity) > 0 && cur.burnChange.symbol) {
              data.burnChange = {
                quantity: cur.burnChange.quantity.toString(),
                symbol: cur.burnChange.symbol
              }
            }

            acc.push(data)

            return acc
          }, [])

          const typeMapKeys = Object.keys(nftTokenMiner.typeMap)

          if (typeMapKeys.length < 1) {
            return
          }

          const typeMap = typeMapKeys.reduce((acc, cur) => {
            acc[cur] = nftTokenMiner.typeMap[cur].filter(m => m !== '').map(m => m.toString())

            return acc
          }, {})

          json.contractPayload.nftTokenMiner = {
            symbol,
            typeField,
            properties,
            typeMap
          }
        }

        const jsonData = {
          id: this.$config.SIDECHAIN_ID,
          keyType: 'Active',
          json,
          message,
          eventName
        }

        this.requestBroadcastJson(jsonData)
      }
    },

    addField (type) {
      if (type === 'miner') {
        this.tokenMiners.push({ symbol: null, multiplier: '' })
      } else if (type === 'properties') {
        this.nftTokenMiner.properties.push({ op: 'ADD', name: '', burnChange: { symbol: null, quantity: '' } })
      }
    },

    removeField (type, index) {
      if (type === 'miner') {
        this.tokenMiners.splice(index, 1)
      } else if (type === 'properties') {
        this.nftTokenMiner.properties.splice(index, 1)
      }
    },

    addTypeMap () {
      this.$v.typeMap.$touch()

      if (!this.$v.typeMap.$invalid) {
        this.nftTokenMiner.typeMap[this.typeMap.type] = this.typeMap.value

        this.$v.typeMap.$reset()

        this.typeMap = {
          type: '',
          value: []
        }
      }
    },

    removeTypeMap (type) {
      Vue.delete(this.nftTokenMiner.typeMap, type)
    },

    async onModalShown (btnEvent, modalId) {
      if (modalId === 'manageMiningPoolModal') {
        this.loading = true

        const pool = JSON.parse(JSON.stringify(this.pool))

        const { lotteryWinners, lotteryIntervalHours, lotteryAmount, tokenMiners, nftTokenMiner } = pool

        this.lotteryWinners = lotteryWinners
        this.lotteryIntervalHours = lotteryIntervalHours
        this.lotteryAmount = lotteryAmount

        this.tokenMiners = tokenMiners

        if (nftTokenMiner) {
          nftTokenMiner.properties = nftTokenMiner.properties.map(p => ({ burnChange: { symbol: null, quantity: '' }, ...p }))

          this.nftTokenMiner = nftTokenMiner
        }

        const [{ poolUpdateFee }, tokenBalance, tokens] = await Promise.all([
          this.$sidechain.getContractParams('mining'),
          this.$sidechain.getBalance(this.$auth.user.username, 'BEE'),
          this.fetchTokens()
        ])

        this.poolUpdateFee = Number(poolUpdateFee)
        this.tokenBalance = tokenBalance ? Number(tokenBalance.balance) : 0
        this.tokens = tokens

        this.loading = false
      }
    },

    onModalHidden (btnEvent, modalId) {
      if (modalId === 'manageMiningPoolModal') {
        this.$v.$reset()

        this.modalBusy = false
        this.loading = true

        this.lotteryWinners = ''
        this.lotteryIntervalHours = ''
        this.lotteryAmount = ''
        this.tokenMiners = []
        this.nftTokenMiner = null
      }
    },

    resetModalBusyState () {
      this.modalBusy = false
    }
  },

  validations: {
    lotteryWinners: {
      required,
      numeric,
      between: between(1, 20)
    },

    lotteryIntervalHours: {
      required,
      numeric,
      between: between(1, 720)
    },

    lotteryAmount: {
      required,
      greaterThanZero (v) {
        if (v === '') {
          return true
        }

        return v > 0
      }
    },

    minedToken: {

    },

    tokenMiners: {
      $each: {
        symbol: {
          required,
          isUnique (value) {
            if (value === '') {
              return true
            }

            return this.tokenMiners.filter(t => t.symbol === value).length === 1
          }
        },

        multiplier: {
          required: requiredIf(vm => vm.symbol),
          numeric,
          greaterThanZero (v) {
            if (v === '') {
              return true
            }

            return v >= 1
          }
        }
      }
    },

    nftTokenMiner: {
      symbol: {
        required: requiredIf(function () {
          return this.enableNftMiner
        })
      },

      typeField: {
        required: requiredIf(function () {
          return this.enableNftMiner
        })
      },

      properties: {
        $each: {
          op: {
            required: requiredIf(function () {
              return this.enableNftMiner
            })
          },

          name: {
            required: requiredIf(function () {
              return this.enableNftMiner
            })
          },

          burnChange: {
            symbol: {
              required: requiredIf((vm) => {
                return Number(vm.quantity) > 0
              })
            },

            quantity: {
              decimal,
              greaterThanZero (v) {
                if (v === '') {
                  return true
                }

                return v > 0
              }
            }
          }
        }
      }
    },

    typeMap: {
      type: {
        required: requiredIf(function () {
          return this.enableNftMiner
        })
      },

      value: {
        required: requiredIf(function () {
          return this.enableNftMiner
        })
      }
    },

    main: ['lotteryWinners', 'lotteryIntervalHours', 'lotteryAmount', 'minedToken', 'tokenMiners', 'nftTokenMiner']
  }
}
</script>

<style>

</style>
