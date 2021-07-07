import { mapActions } from 'vuex'

export default {
  mounted () {
    this.$eventBus.$on([
      'nft-transfer-successful',
      'nft-sell-successful',
      'nft-cancel-sell-successful',
      'nft-change-price-successful',
      'nft-buy-successful',
      'nft-burn-successful'
    ], this.resetActivityModal)
  },

  beforeDestroy () {
    this.$eventBus.$off([
      'nft-transfer-successful',
      'nft-sell-successful',
      'nft-cancel-sell-successful',
      'nft-change-price-successful',
      'nft-buy-successful',
      'nft-burn-successful'
    ], this.resetActivityModal)
  },

  methods: {
    ...mapActions('transaction', ['validateTransaction']),

    async requestValidateTransaction (data) {
      this.loading = true

      await this.validateTransaction(data.id)
    },

    resetActivityModal () {
      this.$bvModal.hide('transferModal')
      this.$bvModal.hide('changePriceModal')
      this.$bvModal.hide('sellModal')
      this.$bvModal.hide('buyModal')
      this.$bvModal.hide('burnModal')
      this.$bvModal.hide('activityModal')
    }
  }
}
