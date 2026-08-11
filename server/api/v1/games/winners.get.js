// GET /api/v1/games/winners?game=bee-invaders — the most recent weekly prize
// results, shown in-app (no on-chain announcement → no Hivewatchers risk).
import { defineEventHandler, getQuery } from 'h3'
import { winnersKey } from '../../../utils/arcade'

const KNOWN_GAMES = ['bee-invaders']

export default defineEventHandler(async (event) => {
  const game = String(getQuery(event).game || 'bee-invaders')
  if (!KNOWN_GAMES.includes(game)) { return { latest: null } }

  const latest = await useStorage('winners').getItem(winnersKey(game, 'latest'))
  return { latest: latest || null }
})
