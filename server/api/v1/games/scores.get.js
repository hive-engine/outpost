// GET /api/v1/games/scores?game=bee-invaders — public high-score table for an
// arcade game. Returns the top entries (one best score per account), newest wins
// on ties. Anonymous-readable so the leaderboard shows for everyone.
import { defineEventHandler, getQuery } from 'h3'

const KNOWN_GAMES = ['bee-invaders']

export default defineEventHandler(async (event) => {
  const game = String(getQuery(event).game || 'bee-invaders')
  if (!KNOWN_GAMES.includes(game)) { return { scores: [] } }

  const data = await useStorage('scores').getItem(game)
  const scores = (data && Array.isArray(data.scores)) ? data.scores : []

  return { scores: scores.slice(0, 25) }
})
