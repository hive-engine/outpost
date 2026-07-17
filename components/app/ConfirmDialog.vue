<template>
  <b-modal
    v-model="dialog.visible"
    :title="dialog.title || undefined"
    :ok-title="dialog.okText"
    :cancel-title="dialog.cancelText"
    :ok-variant="dialog.variant"
    :ok-only="dialog.alertOnly"
    centered
    @ok="settle(true)"
    @cancel="settle(false)"
    @close="settle(false)"
    @hidden="onHidden"
  >
    {{ dialog.message }}
  </b-modal>
</template>

<script setup>
// Global confirm/alert dialog — mounted once in the default layout.
// Drives useUiStore().confirm()/alert() promises.
import { useUiStore } from '~/stores/ui'

const ui = useUiStore()
const dialog = computed(() => ui.confirmDialog)

let settled = false

const settle = (value) => {
  settled = true
  ui._settle(value)
}

// Backdrop click / ESC emit only 'hidden' — treat as cancel if not settled
const onHidden = () => {
  if (!settled) {
    ui._settle(false)
  }
  settled = false
}
</script>
