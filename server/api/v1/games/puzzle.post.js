// POST /api/v1/games/puzzle — submit a guess for today's Daily Buzzle.
// Body: { guess }. Server checks the guess (answer stays server-side), appends the
// coloured result, and on finish updates the user's streak + the streak board.
import { defineEventHandler, readBody, createError } from 'h3'
import { getAppSession } from '../../../utils/session'
import { puzzleDay, wordForDay, scoreGuess, isValidGuess, MAX_GUESSES } from '../../../utils/puzzle'

function prevDay (dayStr) {
  const t = new Date(dayStr + 'T00:00:00Z').getTime() - 86400000
  return new Date(t).toISOString().slice(0, 10)
}

async function updateStreakBoard (store, user, streak, maxStreak) {
  const data = (await store.getItem('streaks')) || { list: [] }
  const list = Array.isArray(data.list) ? data.list : []
  const e = list.find(x => x.user === user)
  if (e) {
    e.streak = streak
    e.maxStreak = Math.max(e.maxStreak || 0, maxStreak)
    e.at = Date.now()
  } else {
    list.push({ user, streak, maxStreak, at: Date.now() })
  }
  list.sort((a, b) => b.streak - a.streak || b.maxStreak - a.maxStreak || a.at - b.at)
  await store.setItem('streaks', { list: list.slice(0, 200), updatedAt: Date.now() })
}

export default defineEventHandler(async (event) => {
  const session = await getAppSession(event)
  const user = session.data && session.data.user
  if (!user) { throw createError({ statusCode: 401, statusMessage: 'Unauthorized' }) }

  const body = await readBody(event).catch(() => ({}))
  const guess = String(body.guess || '').toLowerCase()
  if (!isValidGuess(guess)) { throw createError({ statusCode: 400, statusMessage: 'Guess must be 5 letters' }) }

  const day = puzzleDay()
  const answer = wordForDay(day)
  const store = useStorage('puzzle')

  const rec = (await store.getItem(`${user}_${day}`)) || { guesses: [], status: 'playing' }
  if (rec.status !== 'playing' || rec.guesses.length >= MAX_GUESSES) {
    throw createError({ statusCode: 409, statusMessage: "Today's puzzle is already finished" })
  }

  const result = scoreGuess(guess, answer)
  rec.guesses.push({ word: guess, result })

  let justFinished = false
  if (guess === answer) { rec.status = 'won'; justFinished = true } else if (rec.guesses.length >= MAX_GUESSES) { rec.status = 'lost'; justFinished = true }

  await store.setItem(`${user}_${day}`, rec)

  const meta = (await store.getItem(`${user}_meta`)) || { streak: 0, maxStreak: 0, wins: 0, played: 0, lastDay: null, lastWonDay: null }

  if (justFinished) {
    meta.played = (meta.played || 0) + 1
    if (rec.status === 'won') {
      meta.wins = (meta.wins || 0) + 1
      meta.streak = (meta.lastWonDay === prevDay(day)) ? (meta.streak || 0) + 1 : 1
      meta.lastWonDay = day
      meta.maxStreak = Math.max(meta.maxStreak || 0, meta.streak)
    } else {
      meta.streak = 0
    }
    meta.lastDay = day
    await store.setItem(`${user}_meta`, meta)
    await updateStreakBoard(store, user, meta.streak, meta.maxStreak)
  }

  return {
    day,
    status: rec.status,
    guesses: rec.guesses,
    answer: justFinished ? answer : undefined,
    streak: meta.streak || 0,
    maxStreak: meta.maxStreak || 0
  }
})
