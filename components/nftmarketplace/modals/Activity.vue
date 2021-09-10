<template>
  <div>
    <b-modal
      id="activityModal"
      body-class="activity-modal"
      centered
      scrollable
      no-stacking
      size="lg"
      title="Activities"
    >
      <template v-if="cart.length === 0">
        No item found!
      </template>

      <template v-else>
        <table class="table">
          <tr v-for="(nft, i) of cart" :key="i">
            <td>
              <b-avatar square size="80px">
                <b-img-lazy v-if="getFileType(nft.thumbnail) === 'image'" fluid :src="nft.thumbnail" />

                <video-hover v-if="getFileType(nft.thumbnail) === 'video'" :source="nft.thumbnail" />
              </b-avatar>
            </td>

            <td>
              <div>{{ nft.name }}</div>

              <div class="text-muted small">
                <template v-if="nft.edition">
                  <div><strong>Edition #</strong> {{ nft.edition }}</div>
                </template>

                <template v-if="nft.account">
                  <div><strong>Owner:</strong> {{ nft.account }}</div>
                </template>

                <div><strong>Series:</strong> {{ nft.series }}</div>
              </div>
            </td>

            <td class="text-right">
              {{ nft.price > 0 ? `${nft.price} ${settings.currency} (${getUSDPrice(nft.price)})` : "&nbsp;" }}
              <br>
              <a title="Remove" class="cursor-pointer text-danger" @click.prevent="REMOVE_FROM_CART(nft.nft_id)">
                <fa-icon icon="times" />
              </a>
            </td>
          </tr>
        </table>
      </template>

      <template #modal-footer>
        <div class="w-100">
          <div class="d-flex justify-content-between">
            <div>
              <b-button v-if="cart.length > 0" class="mt-1" variant="warning" @click.prevent="EMPTY_CART()">
                Clear
              </b-button>
            </div>

            <div>
              <b-button v-if="!disableSellAndTransfer" class="mt-1" variant="danger" @click.prevent="$bvModal.show('burnModal')">
                Burn
              </b-button>

              <b-button v-if="!disableSellAndTransfer" class="mt-1" variant="info" @click.prevent="$bvModal.show('sellModal')">
                Sell
              </b-button>

              <b-button v-if="!disableCancelSaleAndChangePrice" class="mt-1" variant="info" @click.prevent="$bvModal.show('changePriceModal')">
                Change Price
              </b-button>

              <b-button v-if="!disableCancelSaleAndChangePrice" class="mt-1" variant="info" @click.prevent="cancelSaleNFT">
                Cancel Sale
              </b-button>

              <b-button v-if="!disableSellAndTransfer" class="mt-1" variant="info" @click.prevent="$bvModal.show('transferModal')">
                Transfer
              </b-button>

              <b-button v-if="!disableBuy" class="mt-1" variant="info" @click.prevent="$bvModal.show('buyModal')">
                Buy
              </b-button>
            </div>
          </div>
        </div>
      </template>
    </b-modal>

    <b-modal id="transferModal" body-class="activity-modal" size="lg" centered title="Transfer NFT">
      <b-form-group>
        <b-form-radio-group
          v-model="recipientType"
          button-variant="outline-primary"
          :options="[{text:'Single Recipient', value:'single'}, {text:'Multiple Recipients', value:'multiple'}]"
          name="recipientType"
          buttons
        />
      </b-form-group>

      <template v-if="recipientType === 'single'">
        <b-form-group description="Enter Hive username of the recipient" label="Recipient *">
          <b-input-group prepend="@">
            <b-form-input v-model="$v.recipient.$model" trim :state="$v.recipient.$dirty ? !$v.recipient.$error : null" />
          </b-input-group>
        </b-form-group>
      </template>

      <template v-else>
        <tag-input
          v-model="recipients"
          label="Recipients *"
          placeholder="Enter Hive usernames"
          :description="`Enter Hive usernames of the recipients. You may enter one username a maximum of 50 times to send a maximum of 50 editions to that user. Max ${avilableForTransferSaleBurn.length} usernames.`"
          :allow-duplicates="true"
          :tag-validator="usernameValidator"
          invalid-tag-text="Invalid username"
          duplicate-tag-text="Duplicate username"
          :max="avilableForTransferSaleBurn.length"
        />
        </b-form-group>

        <b-form-file ref="uploadRecipients" accept="text/csv, text/plain" class="d-none" plain @input="onFileChange" />

        <div class="cursor-pointer" @click.prevent="$refs.uploadRecipients.$el.click()">
          Click here to upload a TXT or CSV file.
        </div>

        <p class="small text-muted">
          For a text file all usernames should be comma seperate in a single line, for CSV all usernames must be on their own line.
        </p>
      </template>

      <template #modal-footer>
        <b-button v-if="recipientType === 'single'" variant="info" :disabled="modalBusy || recipient.length < 3" @click.prevent="transferNFT">
          <b-spinner v-if="modalBusy" small /> Transfer
        </b-button>

        <b-button v-else variant="info" :disabled="modalBusy || recipients.length < 1" @click.prevent="transferMultiple">
          <b-spinner v-if="modalBusy" small /> Transfer
        </b-button>
      </template>
    </b-modal>

    <b-modal id="buyModal" body-class="activity-modal" size="lg" centered title="Buy NFT">
      <p>You are about to buy the following NFTs:</p>

      <table class="table">
        <tr v-for="(n, i) of avilableForBuy" :key="i">
          <td>
            <b-avatar square size="80px">
              <b-img-lazy v-if="getFileType(n.thumbnail) === 'image'" fluid :src="n.thumbnail" />

              <video-hover v-if="getFileType(n.thumbnail) === 'video'" :source="n.thumbnail" />
            </b-avatar>
          </td>
          <td>
            <div>{{ n.name }}</div>
            <div>{{ n.price }} {{ n.symbol }}</div>
          </td>
        </tr>
      </table>

      <p>Total Price: {{ calculateTotal }} {{ settings.currency }}</p>
      <p>Your Balance: {{ currencyBalance }} {{ settings.currency }}</p>

      <template #modal-footer>
        <b-button variant="info" :disabled="modalBusy || calculateTotal > currencyBalance" @click.prevent="buyNFT">
          <b-spinner v-if="modalBusy" small /> Buy
        </b-button>
      </template>
    </b-modal>

    <b-modal id="sellModal" body-class="activity-modal" size="lg" centered title="Sell NFT">
      <b-form-group description="Enter the amount you want to sell each individual NFTs for" label="Price">
        <b-input-group :append="settings.currency">
          <b-form-input v-model.number="price" type="number" trim :state="$v.price.$dirty ? !$v.price.$error : null" />
        </b-input-group>
      </b-form-group>

      <template #modal-footer>
        <b-button variant="info" :disabled="modalBusy || price < 0" @click.prevent="sellNFT">
          <b-spinner v-if="modalBusy" small /> Sell
        </b-button>
      </template>
    </b-modal>

    <b-modal id="changePriceModal" body-class="activity-modal" size="lg" centered title="Change Price">
      <b-form-group description="Enter the amount you want to sell each individual NFTs for" label="New Price">
        <b-input-group :append="settings.currency">
          <b-form-input v-model.number="newPrice" type="number" trim :state="$v.newPrice.$dirty ? !$v.newPrice.$error : null" />
        </b-input-group>
      </b-form-group>

      <template #modal-footer>
        <b-button variant="info" :disabled="modalBusy || newPrice < 0" @click.prevent="changeSellPrice">
          <b-spinner v-if="modalBusy" small /> Change Price
        </b-button>
      </template>
    </b-modal>

    <b-modal id="burnModal" body-class="activity-modal" size="lg" centered title="Burn NFT">
      <p>You are about to burn the following NFTs:</p>

      <table class="table">
        <tr v-for="(n, i) of avilableForTransferSaleBurn" :key="i">
          <td>
            <b-avatar square size="80px">
              <b-img-lazy v-if="getFileType(n.thumbnail) === 'image'" fluid :src="n.thumbnail" />

              <video-hover v-if="getFileType(n.thumbnail) === 'video'" :source="n.thumbnail" />
            </b-avatar>
          </td>
          <td>
            <div>{{ n.name }}</div>
            <div>Edition # {{ n.edition }}</div>
          </td>
        </tr>
      </table>

      <p class="text-danger">
        Please note that this action is irreversible.
      </p>

      <template #modal-footer>
        <b-button variant="danger" :disabled="modalBusy" @click.prevent="burnNFT">
          <b-spinner v-if="modalBusy" small /> Burn
        </b-button>
      </template>
    </b-modal>
  </div>
</template>

<script>
import { mapGetters, mapActions, mapMutations } from 'vuex'
import { required, minLength, maxLength, maxValue } from 'vuelidate/lib/validators'
import VideoHover from '@/components/nftmarketplace/VideoHover.vue'
import TagInput from '@/components/TagInput.vue'

export default {
  name: 'ActivityModal',

  components: {
    VideoHover,
    TagInput
  },

  data () {
    return {
      recipient: '',
      price: '',
      newPrice: '',
      currencyBalance: 0,

      recipientType: 'single',
      recipients: [],

      modalBusy: false
    }
  },

  computed: {
    ...mapGetters('nftmarketplace', ['settings', 'cart', 'token_price']),

    username () {
      return this.$auth.user.username
    },

    disableBuy () {
      const self = this
      return this.cart.every(c => c.account === self.username || c.for_sale === false)
    },

    disableSellAndTransfer () {
      const self = this
      return this.cart.every(c => c.account !== self.username || c.for_sale === true)
    },

    disableCancelSaleAndChangePrice () {
      const self = this
      return this.cart.every(c => c.account !== self.username || c.for_sale === false)
    },

    calculateTotal () {
      return this.cart.reduce((acc, cur) => acc + cur.price, 0)
    },

    avilableForTransferSaleBurn () {
      const self = this
      return this.cart.filter(c => c.account === self.username && c.for_sale === false)
    },

    avilableForBuy () {
      const self = this
      return this.cart.filter(c => c.account !== self.username && c.for_sale === true)
    }
  },

  mounted () {
    this.$root.$on('bv::modal::show', this.activityModalsOnShow)
    this.$root.$on('bv::modal::hidden', this.activityModalsOnHidden)

    this.$eventBus.$on('transaction-broadcast-error', this.resetModalBusyState)
  },

  beforeDestroy () {
    this.$root.$off('bv::modal::show', this.activityModalsOnShow)
    this.$root.$off('bv::modal::hidden', this.activityModalsOnHidden)

    this.$eventBus.$off('transaction-broadcast-error', this.resetModalBusyState)
  },

  methods: {
    ...mapActions('nftmarketplace', ['requestTransfer', 'requestTransferMultiple', 'requestSell', 'requestBuy', 'requestBurn', 'requestCancelSale', 'requestChangePrice']),
    ...mapMutations('nftmarketplace', ['REMOVE_FROM_CART', 'EMPTY_CART']),

    transferNFT () {
      this.$v.recipient.$touch()

      if (!this.$v.recipient.$invalid) {
        this.modalBusy = true

        this.requestTransfer(this.recipient)
      }
    },

    transferMultiple () {
      this.modalBusy = true

      this.requestTransferMultiple(this.recipients)
    },

    changeSellPrice () {
      this.$v.newPrice.$touch()

      if (!this.$v.newPrice.$invalid) {
        this.modalBusy = true

        this.requestChangePrice(this.newPrice)
      }
    },

    sellNFT () {
      this.$v.price.$touch()

      if (!this.$v.price.$invalid) {
        this.modalBusy = true

        this.requestSell(this.price)
      }
    },

    cancelSaleNFT () {
      this.modalBusy = true

      this.requestCancelSale()
    },

    buyNFT () {
      this.modalBusy = true

      this.requestBuy()
    },

    burnNFT () {
      this.modalBusy = true

      this.requestBurn()
    },

    getUSDPrice (hivePrice) {
      return `$${Number(Number(hivePrice) * this.token_price).toFixed(3)}`
    },

    getFileType (url) {
      const ext = url.toLowerCase().split('.').pop()

      const exts = {
        png: 'image',
        jpg: 'image',
        jpeg: 'image',
        gif: 'image',
        mp4: 'video',
        webm: 'video',
        mp3: 'audio',
        mpga: 'audio',
        wav: 'audio'
      }

      return exts[ext]
    },

    async activityModalsOnShow (bvEvent, modalId) {
      if (modalId === 'activityModal') {
        this.$v.$reset()

        this.recipient = ''
        this.price = ''
        this.newPrice = ''
        this.recipients = []
      }

      if (modalId === 'buyModal') {
        const balance = await this.$sidechain.getBalance(this.$auth.user.username, this.settings.currency)

        this.currencyBalance = balance ? Number(balance.balance) : 0
      }
    },

    activityModalsOnHidden (bvEvent, modalId) {
      if (['transferModal', 'changePriceModal', 'sellModal', 'buyModal', 'burnModal', 'activityModal'].includes(modalId)) {
        this.resetModalBusyState()
      }
    },

    resetModalBusyState () {
      this.modalBusy = false
    },

    usernameValidator (tag) {
      return (
        tag === tag.toLowerCase() &&
        tag.length >= 3 &&
        tag.length <= 16 &&
        /^([a-z])[a-z0-9-.]+[a-z0-9]$/.test(tag)
      )
    },

    onFileChange (file) {
      if (file.type === 'text/csv' || file.type === 'text/plain') {
        const reader = new FileReader()

        reader.onload = (e) => {
          let lines = e.target.result.split(',')

          if (file.type === 'text/csv') {
            lines = e.target.result.split('\n')
          }

          const recipients = lines.reduce((acc, cur) => {
            const [account] = cur.split(',')

            if (account) {
              acc.push(account)
            }

            return acc
          }, [])
            .filter(r => this.usernameValidator(r))

          this.recipients = recipients.slice(0, this.avilableForTransferSaleBurn.length)
        }

        reader.readAsText(file)
      }
    }
  },

  validations: {
    recipient: {
      required,
      minLength: minLength(3),
      maxLength: maxLength(16),
      validUsername: (value) => {
        if (value === '') { return true }

        return /^([a-z])[a-z0-9-.]*$/.test(value)
      }
    },

    price: {
      required,
      maxValue: maxValue(Number.MAX_SAFE_INTEGER)
    },

    newPrice: {
      required,
      maxValue: maxValue(Number.MAX_SAFE_INTEGER)
    }
  }
}
</script>

<style>

</style>
