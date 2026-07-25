// Health endpoint — reports app liveness AND Hive RPC reachability separately,
// so a "we can't reach the Hive network" situation is never mistaken for the app
// being down. Returns 200 when the Hive RPC is reachable, 503 when every node
// fails (app still fine). Used by the watchdog and for at-a-glance monitoring:
//   curl -s https://www.thebbhproject.com/api/v1/health | jq
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig().public
  const nodes = Array.isArray(config.NODES) ? config.NODES : []

  let hiveRpc = 'down'
  let node = null
  let block = null
  const tried = []

  for (const n of nodes) {
    try {
      const res = await $fetch(n, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { jsonrpc: '2.0', method: 'condenser_api.get_dynamic_global_properties', params: [], id: 1 },
        timeout: 4000
      })

      if (res && res.result && res.result.head_block_number) {
        hiveRpc = 'up'
        node = n
        block = res.result.head_block_number
        break
      }
      tried.push(n)
    } catch {
      tried.push(n)
    }
  }

  setResponseStatus(event, hiveRpc === 'up' ? 200 : 503)

  return {
    app: 'ok',
    hiveRpc,
    node,
    block,
    nodesDown: hiveRpc === 'up' ? tried : nodes,
    ts: new Date().toISOString()
  }
})
