// GET /api/v1/drafts — the logged-in user's saved drafts, from the persistent
// server store (account-scoped, so they're available on every device). Anonymous
// requests get an empty set (the client falls back to its localStorage backup).
import { defineEventHandler } from 'h3'
import { getAppSession } from '../../utils/session'

export default defineEventHandler(async (event) => {
  const session = await getAppSession(event)
  const user = session.data && session.data.user

  if (!user) { return { drafts: [], auto: null } }

  const data = await useStorage('drafts').getItem(user)

  return {
    drafts: (data && Array.isArray(data.drafts)) ? data.drafts : [],
    auto: (data && data.auto) || null
  }
})
