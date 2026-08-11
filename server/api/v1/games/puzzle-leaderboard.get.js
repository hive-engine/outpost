// GET /api/v1/games/puzzle-leaderboard — Daily Buzzle streak board (public).
import { defineEventHandler } from 'h3'

export default defineEventHandler(async () => {
  const data = await useStorage('puzzle').getItem('streaks')
  const list = (data && Array.isArray(data.list)) ? data.list : []
  return { streaks: list.slice(0, 25) }
})
