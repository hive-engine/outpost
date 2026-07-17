export const actions = {
  async validateTransaction ({ commit, dispatch }, trxId) {
    let error = false
    let trx = null
    let count = 0

    do {
      try {
        await this.$chain.sleep(3000)

        trx = await this.$sidechain.getTransaction(trxId)
      } catch (e) {
        console.log(e)
      }

      count += 1
    } while (!trx && count < 10)

    if (trx) {
      const logs = JSON.parse(trx.logs)

      if (logs.errors) {
        error = true
        dispatch('showNotification', { title: 'Error', message: logs.errors[0], type: 'error' }, { root: true })
      }

      this.$eventBus.$emit('transaction-validated', { contract: trx ? trx.contract : null, action: trx ? trx.action : null, error })
    }
  }
}
