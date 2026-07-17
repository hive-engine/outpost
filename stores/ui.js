// UI store — the global modal registry + promise-based confirm/alert dialogs.
// Replaces the BootstrapVue $bvModal programmatic API:
//   $bvModal.show('id') / hide('id')      -> useUiStore().showModal/hideModal('id')
//   $bvModal.msgBoxConfirm(msg, opts)     -> useUiStore().confirm({ message, ...opts })  (Promise<boolean>)
//   $bvModal.msgBoxOk(msg, opts)          -> useUiStore().alert({ message, ...opts })    (Promise<true>)
// Modal components bind their BModal to `modals[id]` (see CONVERSION.md).
import { defineStore } from 'pinia'

export const useUiStore = defineStore('ui', {
  state: () => ({
    modals: {}, // id -> boolean (v-model target for BModal)

    confirmDialog: {
      visible: false,
      title: '',
      message: '',
      variant: 'success',
      okText: 'Yes',
      cancelText: 'No',
      alertOnly: false
    }
  }),

  actions: {
    showModal (id) {
      this.modals[id] = true
    },

    hideModal (id) {
      this.modals[id] = false
    },

    toggleModal (id) {
      this.modals[id] = !this.modals[id]
    },

    // Promise<boolean>: true on OK, false on cancel/close (matches msgBoxConfirm)
    confirm ({ message, title = '', variant = 'success', okText = 'Yes', cancelText = 'No' }) {
      return new Promise((resolve) => {
        this._resolve = resolve
        this.confirmDialog = { visible: true, title, message, variant, okText, cancelText, alertOnly: false }
      })
    },

    // Promise<true> once dismissed (matches msgBoxOk)
    alert ({ message, title = '', okText = 'OK' }) {
      return new Promise((resolve) => {
        this._resolve = resolve
        this.confirmDialog = { visible: true, title, message, variant: 'primary', okText, cancelText: '', alertOnly: true }
      })
    },

    // Called by ConfirmDialog.vue
    _settle (value) {
      this.confirmDialog.visible = false

      if (this._resolve) {
        this._resolve(this.confirmDialog.alertOnly ? true : value)
        this._resolve = null
      }
    }
  }
})
