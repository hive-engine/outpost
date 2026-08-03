// GET /api/v1/bookmarks — the logged-in user's saved posts (account-scoped, so
// bookmarks follow the user across devices). Anonymous → empty.
import { defineEventHandler } from 'h3'
import { getAppSession } from '../../utils/session'

export default defineEventHandler(async (event) => {
  const session = await getAppSession(event)
  const user = session.data && session.data.user

  if (!user) { return { bookmarks: [] } }

  const data = await useStorage('bookmarks').getItem(user)

  return { bookmarks: (data && Array.isArray(data.bookmarks)) ? data.bookmarks : [] }
})
