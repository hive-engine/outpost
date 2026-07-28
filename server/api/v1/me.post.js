// POST /api/v1/me — ported from legacy app.post('/me'). Session -> user or 401.
import { defineEventHandler, createError } from 'h3'
import { getAppSession } from '../../utils/session'

export default defineEventHandler(async (event) => {
  const session = await getAppSession(event)

  const { user: username, smartlock, method } = session.data || {}

  if (username) {
    return { username, smartlock, method: method || 'keychain' }
  }

  throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
})
