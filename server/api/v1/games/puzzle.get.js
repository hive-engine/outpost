// GET /api/v1/games/puzzle — today's Daily Buzzle state for the logged-in user.
// The answer is only included once the day's puzzle is finished (won/lost), so it
// never leaks while playing.
import { defineEventHandler } from 'h3'
import { getAppSession } from '../../../utils/session'
import { puzzleDay, wordForDay, MAX_GUESSES, WORD_LEN } from '../../../utils/puzzle'

export default defineEventHandler(async (event) => {
  const session = await getAppSession(event)
  const user = session.data && session.data.user
  const day = puzzleDay()
  const base = { day, wordLen: WORD_LEN, maxGuesses: MAX_GUESSES }

  if (!user) {
    return { ...base, loggedIn: false, guesses: [], status: 'anon', streak: 0, maxStreak: 0 }
  }

  const store = useStorage('puzzle')
  const rec = (await store.getItem(`${user}_${day}`)) || { guesses: [], status: 'playing' }
  const meta = (await store.getItem(`${user}_meta`)) || { streak: 0, maxStreak: 0, wins: 0, played: 0 }
  const done = rec.status === 'won' || rec.status === 'lost'

  return {
    ...base,
    loggedIn: true,
    guesses: rec.guesses,
    status: rec.status,
    answer: done ? wordForDay(day) : undefined,
    streak: meta.streak || 0,
    maxStreak: meta.maxStreak || 0,
    wins: meta.wins || 0,
    played: meta.played || 0
  }
})
