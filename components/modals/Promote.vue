<template>
  <b-modal id="promotePost" title="Promote Post">
    <div>Burn {{ $config.TOKEN }} to advertize this post in the promoted contents section.</div>

    <b-form-group label="Post" class="mt-3">
      <b-form-input readonly :value="authorperm" />
    </b-form-group>

    <b-form-group label="Balance">
      <div class="d-inline-block cursor-pointer" @click="amount = balance">
        {{ balance }} {{ $config.TOKEN }}
      </div>
    </b-form-group>

    <b-form-group label="Amount">
      <b-input-group :append="$config.TOKEN">
        <b-form-input v-model="amount" number />
      </b-input-group>
    </b-form-group>

    <template #modal-footer>
      <b-button variant="primary" :disabled="amount > balance || amount < 1" @click="requestPromotePost({memo: authorperm, amount})">
        Promote
      </b-button>
    </template>
  </b-modal>
</template>

<script>
import { mapActions } from 'vuex'

export default {
  name: 'PromoteModal',

  props: {
    author: { type: String, required: true },
    permlink: { type: String, required: true }
  },

  data () {
    return {
      balance: 0,
      amount: 0
    }
  },

  computed: {
    authorperm () {
      return `@${this.author}/${this.permlink}`
    }
  },

  mounted () {
    const self = this

    this.$root.$on('bv::modal::show', async (_, modalId) => {
      if (modalId === 'promotePost') {
        const balance = await self.$sidechain.getBalance(self.$auth.user.username, this.$config.TOKEN)

        if (balance) {
          self.balance = Number(balance.balance)
        }
      }
    })

    this.$eventBus.$on('post-promotion-successful', ({ memo }) => {
      self.amount = 0

      self.$notify({
        title: 'Success',
        type: 'success',
        text: `Successfully promoted ${memo}`
      })

      self.$bvModal.hide('promotePost')
    })
  },

  beforeDestroy () {
    this.$root.$off('bv::modal:show')
    this.$eventBus.$off('post-promotion-successful')
  },

  methods: {
    ...mapActions('post', ['requestPromotePost'])
  }
}
</script>

<style>

</style>
