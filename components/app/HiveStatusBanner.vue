<template>
  <div v-if="down" class="hive-status-banner">
    <fa-icon icon="exclamation-circle" class="hsb-icon" />
    <span class="hsb-text">
      We're having trouble reaching the <strong>Hive network</strong> right now — this is a Hive RPC-node issue, not the site itself. Some data may not load.
    </span>
    <button class="hsb-retry" @click="retry">
      <fa-icon icon="sync" /> Retry
    </button>
  </div>
</template>

<script setup>
// Site-wide banner shown when the Hive RPC/SCOT nodes are unreachable. Driven by
// the shared useHiveStatus() flag; non-fatal (the page still renders whatever it
// could load). Makes an RPC outage unmistakable instead of a bare 502/empty page.
import { useHiveStatus } from '~/composables/useHiveStatus'

const down = useHiveStatus()
const retry = () => { if (import.meta.client) { window.location.reload() } }

// Actively confirm Hive RPC reachability once on load (catches the case where
// SCOT is up but the Hive RPC nodes are down — the exact failover-churn scenario).
onMounted(async () => {
  try {
    // ignoreResponseError: the endpoint returns 503 when RPC is down — we still
    // want to read the body (otherwise $fetch throws and we'd miss the signal).
    const h = await $fetch('/api/v1/health', { ignoreResponseError: true })
    down.value = !!(h && h.hiveRpc === 'down')
  } catch {
    // /api/v1/health itself unreachable → that's an app/proxy problem, not RPC;
    // leave the flag as whatever tribe-init decided.
  }
})
</script>

<style scoped>
.hive-status-banner {
  display: flex;
  align-items: center;
  gap: .7rem;
  flex-wrap: wrap;
  justify-content: center;
  padding: .6rem 1rem;
  background: linear-gradient(90deg, rgba(224, 31, 38, .18), rgba(245, 184, 0, .18));
  border-bottom: 1px solid rgba(245, 184, 0, .35);
  color: var(--w3-text, #f4f4f5);
  font-size: .9rem;
  position: relative;
  z-index: 60;
}
.hsb-icon { color: var(--w3-gold, #f5b800); }
.hsb-text { max-width: 780px; }
.hsb-text strong { color: var(--w3-gold, #f5b800); }
.hsb-retry {
  border: 1px solid rgba(245, 184, 0, .5);
  background: transparent;
  color: var(--w3-gold, #f5b800);
  font-weight: 700;
  border-radius: 999px;
  padding: .25rem .8rem;
  cursor: pointer;
  white-space: nowrap;
  transition: all .15s ease;
}
.hsb-retry:hover { background: var(--w3-gold, #f5b800); color: #1a1206; }
</style>
