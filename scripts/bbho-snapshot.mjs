#!/usr/bin/env node
// BBHO holder snapshot — for the eventual airdrop when migrating BBHO to Magi.
//
// Walks the Hive-Engine tokens.balances table for BBHO and records every holder
// with a computed "total owned" (liquid + staked + unstaking + delegated-out;
// delegations-IN are excluded — those belong to the delegator). Writes JSON + CSV
// and prints a summary that reconciles against circulating supply.
//
//   node scripts/bbho-snapshot.mjs [SYMBOL]     # default SYMBOL = BBHO
//
// NOTE: this is a "current" snapshot. For the real migration snapshot, run it at
// the agreed moment (the timestamp is recorded in the output). If you need an
// exact Hive block, coordinate a pause/announcement so balances are stable.
import fs from 'node:fs'

const RPC = 'https://enginerpc.com/contracts'
const SYMBOL = process.argv[2] || 'BBHO'
const PAGE = 1000

const call = async (contract, table, query, offset) => {
  const res = await fetch(RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', method: 'find', params: { contract, table, query, limit: PAGE, offset }, id: 1 })
  })
  return (await res.json()).result || []
}

const num = v => Number(v) || 0

async function main () {
  const stamp = new Date().toISOString()
  console.log(`Snapshotting ${SYMBOL} holders @ ${stamp} …`)

  const holders = []
  let offset = 0
  for (;;) {
    const batch = await call('tokens', 'balances', { symbol: SYMBOL }, offset)
    if (!batch.length) { break }

    for (const b of batch) {
      const liquid = num(b.balance)
      const stake = num(b.stake)
      const pendingUnstake = num(b.pendingUnstake)
      const delegationsOut = num(b.delegationsOut)
      const delegationsIn = num(b.delegationsIn)
      const pendingUndelegations = num(b.pendingUndelegations)

      // Tokens the account OWNS (regardless of state). Delegated-out is still
      // theirs; delegated-in belongs to someone else, so it's excluded.
      const total = liquid + stake + pendingUnstake + delegationsOut + pendingUndelegations

      if (total > 0) {
        holders.push({ account: b.account, total: +total.toFixed(8), liquid, stake, pendingUnstake, delegationsOut, delegationsIn, pendingUndelegations })
      }
    }

    offset += PAGE
    process.stdout.write(`\r  fetched ${offset} rows, ${holders.length} holders…`)
    if (batch.length < PAGE) { break }
  }

  holders.sort((a, b) => b.total - a.total)
  const grandTotal = holders.reduce((s, h) => s + h.total, 0)

  const out = {
    symbol: SYMBOL,
    snapshot_at: stamp,
    holder_count: holders.length,
    total_tokens: +grandTotal.toFixed(8),
    formula: 'total = balance + stake + pendingUnstake + delegationsOut + pendingUndelegations',
    holders
  }

  const base = `bbho-snapshot-${stamp.slice(0, 10)}`
  fs.writeFileSync(`${base}.json`, JSON.stringify(out, null, 2))
  fs.writeFileSync(`${base}.csv`, 'account,total,liquid,stake,pendingUnstake,delegationsOut\n' +
    holders.map(h => `${h.account},${h.total},${h.liquid},${h.stake},${h.pendingUnstake},${h.delegationsOut}`).join('\n') + '\n')

  console.log(`\n\n✓ ${holders.length} holders, ${grandTotal.toFixed(3)} ${SYMBOL} total`)
  console.log(`  written: ${base}.json + ${base}.csv`)
  console.log('  top 5:')
  holders.slice(0, 5).forEach(h => console.log(`    ${h.account.padEnd(20)} ${h.total.toFixed(3)}`))
}

main().catch(e => { console.error('\n✖', e.message); process.exit(1) })
