// Ported from legacy/store/transaction.js (Vuex module) → Pinia 'transaction' store.
import { defineStore } from 'pinia'
import { useTribeStore } from '~/stores/tribe'

export const useTransactionStore = defineStore('transaction', {
  actions: {
    async validateTransaction (trxId) {
      const { $chain, $sidechain, $eventBus } = useNuxtApp()

      let error = false
      let trx = null
      let count = 0

      do {
        try {
          await $chain.sleep(3000)

          trx = await $sidechain.getTransaction(trxId)
        } catch (e) {
          console.log(e)
        }

        count += 1
      } while (!trx && count < 10)

      if (trx) {
        const logs = JSON.parse(trx.logs)

        if (logs.errors) {
          error = true
          useTribeStore().showNotification({ title: 'Error', message: logs.errors[0], type: 'error' })
        }

        $eventBus.$emit('transaction-validated', { contract: trx ? trx.contract : null, action: trx ? trx.action : null, error })
      }
    }
  }
})
