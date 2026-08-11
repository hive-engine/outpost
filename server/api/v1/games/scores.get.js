// GET /api/v1/games/scores?game=bee-invaders&board=casual|ranked
// Public high-score tables. `casual` = all-time free-play board; `ranked` = the
// current week's paid/prize board. One best score per account. Anonymous-readable.
import { defineEventHandler, getQuery } from 'h3'
import { weekKey, rankedBoardKey } from '../../../utils/arcade'

const KNOWN_GAMES = ['bee-invaders']

export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const game = String(q.game || 'bee-invaders')
  if (!KNOWN_GAMES.includes(game)) { return { scores: [] } }

  const board = q.board === 'ranked' ? 'ranked' : 'casual'
  const key = board === 'ranked' ? rankedBoardKey(game, weekKey()) : game

  const data = await useStorage('scores').getItem(key)
  const scores = (data && Array.isArray(data.scores)) ? data.scores : []

  return { board, week: board === 'ranked' ? weekKey() : null, scores: scores.slice(0, 25) }
})
