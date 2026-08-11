// GET /api/v1/games/entries?game=bee-invaders — the logged-in user's remaining
// free ranked entries for today (read-only; does NOT consume one). Lets the UI
// show "N free ranked games left" so the entry-fee popup is never a surprise.
import { defineEventHandler, getQuery } from 'h3'
import { getAppSession } from '../../../utils/session'
import { ARCADE, dayKey, getBbhoBalance } from '../../../utils/arcade'

export default defineEventHandler(async (event) => {
  const game = String(getQuery(event).game || 'bee-invaders')
  const session = await getAppSession(event)
  const user = session.data && session.data.user

  const base = {
    entryFee: ARCADE.entryFee,
    symbol: ARCADE.symbol,
    freeEntriesPerDay: ARCADE.freeEntriesPerDay,
    stakerPerkMinStake: ARCADE.stakerPerkMinStake
  }

  if (!user) { return { ...base, loggedIn: false, freeLeft: null } }

  const { stake } = await getBbhoBalance(user)
  const isStaker = stake >= ARCADE.stakerPerkMinStake
  const allowance = ARCADE.freeEntriesPerDay + (isStaker ? 1 : 0)

  const usedKey = `free:${game}:${user}:${dayKey()}`
  const used = Number((await useStorage('gamesessions').getItem(usedKey)) || 0)
  const freeLeft = Math.max(0, allowance - used)

  return { ...base, loggedIn: true, isStaker, allowance, used, freeLeft }
})
