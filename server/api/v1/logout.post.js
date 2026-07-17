// POST /api/v1/logout — ported from legacy app.post('/logout'). Clears session.
import { defineEventHandler } from 'h3'
import { getAppSession } from '../../utils/session'

export default defineEventHandler(async (event) => {
  const session = await getAppSession(event)

  await session.clear()

  return { status: 'ok' }
})
