<template>
  <div class="add-to-cart">
    <template v-if="cartItemExist">
      <b-button variant="danger" size="sm" @click="removeFromCart(nft, $event)">
        <fa-icon icon="cart-arrow-down" />
      </b-button>
    </template>

    <template v-else>
      <b-button variant="primary" size="sm" @click="addToCart(nft, $event)">
        <fa-icon icon="cart-plus" />
      </b-button>
    </template>
  </div>
</template>

<script>
import { mapGetters, mapMutations } from 'vuex'

export default {
  name: 'AddToCart',

  props: {
    nft: { type: Object, required: true },
    items: { type: Array, required: true }
  },

  computed: {
    ...mapGetters('nftmarketplace', ['cart']),

    cartItemExist () {
      return this.cart.some(p => p.nft_id === this.nft.nft_id)
    }
  },

  methods: {
    ...mapMutations('nftmarketplace', ['ADD_TO_CART', 'REMOVE_FROM_CART', 'EMPTY_CART']),

    addToCart (nft, event) {
      if (event.shiftKey) {
        const items = JSON.parse(JSON.stringify(this.items))

        const lastAdded = this.cart.filter(c => c.series === this.nft.series)

        if (lastAdded.length <= 0) { this.ADD_TO_CART(nft) }

        const cartMapped = new Map(this.cart.map(p => [p.nft_id, p]))

        const lastItem = lastAdded[lastAdded.length - 1] || nft
        const lastIndex = items.findIndex(c => c.nft_id === lastItem.nft_id)
        const currentIndex = items.findIndex(c => c.nft_id === nft.nft_id)

        const start = (lastIndex > currentIndex) ? currentIndex : lastIndex + 1
        const end = (lastIndex > currentIndex) ? lastIndex : currentIndex + 1

        items.slice(start, end).forEach((c) => {
          if (!cartMapped.has(c.nft_id)) {
            this.ADD_TO_CART(c)
          }
        })
      } else {
        this.ADD_TO_CART(nft)
      }
    },

    removeFromCart ({ nft_id: nftId }, event) {
      if (event.shiftKey) {
        const items = JSON.parse(JSON.stringify(this.items))

        const lastAdded = this.cart.filter(c => c.series === this.nft.series)

        if (lastAdded.length > 0) { this.REMOVE_FROM_CART(lastAdded[lastAdded.length - 1].nft_id) }

        const lastItem = lastAdded[lastAdded.length - 1] || { nft_id: nftId }
        const lastIndex = items.findIndex(c => c.nft_id === lastItem.nft_id)
        const currentIndex = items.findIndex(c => c.nft_id === nftId)

        const start = (lastIndex > currentIndex) ? currentIndex : lastIndex + 1
        const end = (lastIndex > currentIndex) ? lastIndex : currentIndex + 1

        this.EMPTY_CART(items.slice(start, end).map(n => n.nft_id))
      } else {
        this.REMOVE_FROM_CART(nftId)
      }
    }
  }
}
</script>

<style>

</style>
