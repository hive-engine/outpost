<template>
  <div class="manual-issue">
    <h3 class="h4">
      Issue Manually
    </h3><hr>

    <b-alert show="" dismissible variant="warning">
      Please be extra careful while using this tool. This is an extremely
      powerful tool, if misused or used carelessly, it might corrupt the NFT
      history.
    </b-alert>

    <b-row>
      <b-col cols="12" md="8" class="mt-3">
        <b-form-group label="Transaction ID" class="mb-0">
          <b-form-input v-model="trxId" trim autocomplete="off" :state="$v.trxId.$dirty ? !$v.trxId.$error : null" />
        </b-form-group>
      </b-col>

      <b-col cols="12" md="4" class="mt-3" align-self="end">
        <b-button variant="primary" :disabled="trxId.length < 40" @click.prevent="issueManually">
          Issue Manually
        </b-button>
      </b-col>
    </b-row>
  </div>
</template>

<script>
import { mapActions } from 'vuex'
import { required, alphaNum, minLength } from 'vuelidate/lib/validators'

export default {
  name: 'ManualIssue',

  data () {
    return {
      trxId: ''
    }
  },

  validations: {
    trxId: {
      required,
      alphaNum,
      minLength: minLength(40)
    }
  },

  mounted () {
    const self = this

    this.$eventBus.$on('manual-issue-successful', () => {
      self.trxId = ''
      self.$v.$reset()

      this.$notify({ title: 'Success', text: 'We have received your request', type: 'success' })
    })
  },

  beforeDestroy () {
    this.$eventBus.$off('manual-issue-successful')
  },

  methods: {
    ...mapActions('nftmarketplace', ['requestManualIssue']),

    issueManually () {
      this.$v.$touch()

      if (this.$v.$invalid) {
        return
      }

      return this.requestManualIssue({ trx_id: this.trxId })
    }
  }
}
</script>

<style>

</style>
