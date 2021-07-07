<template>
  <div class="add-to-cart">
    <template v-if="cartItemExist">
      <b-button variant="danger" size="sm" @click="removeFromCart(nft)">
        <fa-icon icon="cart-arrow-down" />
      </b-button>
    </template>

    <template v-else>
      <b-button variant="primary" size="sm" @click="addToCart(nft)">
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
    nft: { type: Object, required: true }
  },

  computed: {
    ...mapGetters('nftmarketplace', ['cart']),

    cartItemExist () {
      return this.cart.some(p => p.nft_id === this.nft.nft_id)
    }
  },

  methods: {
    ...mapMutations('nftmarketplace', ['ADD_TO_CART', 'REMOVE_FROM_CART']),

    addToCart (nft) {
      this.ADD_TO_CART(nft)
    },

    removeFromCart ({ nft_id: nftId }) {
      this.REMOVE_FROM_CART(nftId)
    }
  }
}
</script>

<style>

</style>
